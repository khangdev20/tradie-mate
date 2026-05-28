import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { GSTService } from '../../services/gst.service'
import { supabase } from '../../config/supabase'
import { AppError } from '../../utils/errors'

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/', async (request) => {
    const { job_id, items } = request.body as { 
      job_id: string, 
      items: { description: string, qty: number, unit_price: number }[] 
    }

    // 1. Calculate totals in integer cents
    let subtotalCents = 0
    const invoiceItems = items.map((item, idx) => {
      const lineTotalCents = Math.round(item.qty * item.unit_price * 100)
      subtotalCents += lineTotalCents
      return {
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: lineTotalCents / 100, // stored as decimal in DB but calculated precisely
        sort_order: idx
      }
    })

    const { gst, total } = GSTService.calculateFromSubtotal(subtotalCents)

    // 2. Get next invoice number for this tradie (sequential)
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('tradie_id', request.tradie.id)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    const nextInvoiceNumber = (lastInvoice?.invoice_number || 0) + 1

    // 3. Create invoice + items in transaction (Supabase RPC or sequential)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        job_id,
        tradie_id: request.tradie.id,
        invoice_number: nextInvoiceNumber,
        status: 'DRAFT',
        subtotal: subtotalCents / 100,
        gst_amount: gst / 100,
        total: total / 100,
        currency: 'AUD',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
      })
      .select()
      .single()

    if (invoiceError) throw new AppError(invoiceError.message, 500)

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems.map(item => ({ ...item, invoice_id: invoice.id })))

    if (itemsError) throw new AppError(itemsError.message, 500)

    // TODO: Queue PDF generation via BullMQ

    return { invoice }
  })
}
