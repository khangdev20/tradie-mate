import { db } from '../config/db'
import { subscriptionPlans, planEntitlements } from './schema/subscriptions'
import { tradies, tradieAuthMethods } from './schema/tradies'
import { customers } from './schema/customers'
import { jobs } from './schema/jobs'
import { invoices, invoiceItems, invoiceSequence } from './schema/invoices'
import { eq, desc, inArray } from 'drizzle-orm'
import { supabaseAdmin } from '../config/supabase'

async function getOrCreateTestUser() {
  const email = 'test@tradiemate.com'
  const phone = '+61412345678'
  const password = 'Password123!'

  console.log('🔍 Checking if default test tradie exists in database...')
  
  // 1. Check if the tradie already exists in database
  let [existingTradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.email, email))
    .limit(1)

  if (existingTradie) {
    console.log(`✓ Default test tradie found in database: ${existingTradie.firstName} ${existingTradie.lastName}`)
    return existingTradie
  }

  // 2. If not in DB, check if the user exists in Supabase Auth
  let authUserId: string | null = null
  try {
    console.log('🔍 Checking if user exists in Supabase Auth...')
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const existingAuthUser = users?.find(u => u.email === email || u.phone === phone)
    if (existingAuthUser) {
      console.log(`✓ Existing Supabase Auth user found: ${existingAuthUser.id}`)
      authUserId = existingAuthUser.id
    } else {
      // 3. Create user in Supabase Auth if not exists
      console.log('🌱 Creating new user in Supabase Auth...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
        phone_confirm: true,
        user_metadata: {
          first_name: 'Dave',
          last_name: 'Plumber',
          trade_type: 'PLUMBER'
        }
      })

      if (authError) throw authError
      authUserId = authData.user.id
      console.log(`✓ New Supabase Auth user created: ${authUserId}`)
    }
  } catch (error: any) {
    console.warn('⚠️ Supabase Auth integration failed/skipped. Falling back to a mock auth user ID.', error.message)
    authUserId = '00000000-0000-0000-0000-000000000000'
  }

  // 4. Create the tradie record in database
  console.log('🌱 Inserting default test tradie record in database...')
  const [newTradie] = await db.insert(tradies).values({
    authUserId: authUserId,
    firstName: 'Dave',
    lastName: 'Plumber',
    phone: phone,
    email: email,
    tradeType: 'PLUMBER',
    abn: '51824753556',
    abnEntityName: 'DAVE PLUMBING PTY LTD',
    abnGstRegistered: true,
    abnVerifiedAt: new Date(),
    hourlyRateCents: 8500,
    calloutFeeCents: 5750,
    licenceVerified: true,
    insuranceVerified: true,
    isOnboarded: true,
    isActive: true,
    hasPassword: true,
  }).returning()

  // 5. Create auth methods
  console.log('🌱 Inserting auth methods for test tradie...')
  await db.insert(tradieAuthMethods).values([
    {
      tradieId: newTradie.id,
      provider: 'email',
      providerId: authUserId,
      email: email,
      isPrimary: true,
    },
    {
      tradieId: newTradie.id,
      provider: 'phone',
      providerId: authUserId,
      phone: phone,
      isPrimary: false,
    }
  ])

  console.log(`✓ Created test tradie record for ${newTradie.firstName} ${newTradie.lastName}`)
  return newTradie
}


async function seed() {
  console.log('🌱 Starting subscription plans seed...')

  const plans = [
    {
      code: 'SOLO_STARTER',
      displayName: 'Solo Starter',
      description: 'Perfect for new solo operators.',
      priceCents: 2900,
      currency: 'AUD',
      billingInterval: 'MONTH' as const,
      stripePriceId: 'price_starter_mock',
      isPublic: true,
      sortOrder: 1,
    },
    {
      code: 'SOLO_PRO',
      displayName: 'Solo Pro',
      description: 'The complete toolkit for serious solo tradies.',
      priceCents: 4900,
      currency: 'AUD',
      billingInterval: 'MONTH' as const,
      stripePriceId: 'price_pro_mock',
      isPublic: true,
      sortOrder: 2,
    },
    {
      code: 'TEAM',
      displayName: 'Team Pro',
      description: 'Scale your business and onboard multiple staff.',
      priceCents: 8900,
      currency: 'AUD',
      billingInterval: 'MONTH' as const,
      stripePriceId: 'price_team_mock',
      isPublic: true,
      sortOrder: 3,
    },
  ]

  const entitlements = [
    {
      planCode: 'SOLO_STARTER',
      entitlements: {
        maxJobsPerMonth: 15,
        maxInvoicesPerMonth: 10,
        tapToPayEnabled: false,
        customerTrackingEnabled: false,
        reviewRequestsEnabled: false,
        xeroSyncEnabled: false,
        teamMembersLimit: 1,
        callToJobEnabled: false,
        aiVoiceEnabled: false,
      },
    },
    {
      planCode: 'SOLO_PRO',
      entitlements: {
        maxJobsPerMonth: 100,
        maxInvoicesPerMonth: 100,
        tapToPayEnabled: true,
        customerTrackingEnabled: true,
        reviewRequestsEnabled: true,
        xeroSyncEnabled: true,
        teamMembersLimit: 1,
        callToJobEnabled: false,
        aiVoiceEnabled: false,
      },
    },
    {
      planCode: 'TEAM',
      entitlements: {
        maxJobsPerMonth: 9999,
        maxInvoicesPerMonth: 9999,
        tapToPayEnabled: true,
        customerTrackingEnabled: true,
        reviewRequestsEnabled: true,
        xeroSyncEnabled: true,
        teamMembersLimit: 5,
        callToJobEnabled: true,
        aiVoiceEnabled: true,
      },
    },
  ]

  // Upsert plans
  for (const p of plans) {
    const [existing] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, p.code))
      .limit(1)

    if (!existing) {
      await db.insert(subscriptionPlans).values(p)
      console.log(`Plan ${p.code} created.`)
    } else {
      await db
        .update(subscriptionPlans)
        .set(p)
        .where(eq(subscriptionPlans.code, p.code))
      console.log(`Plan ${p.code} updated.`)
    }
  }

  // Upsert entitlements
  for (const e of entitlements) {
    const [existing] = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.planCode, e.planCode))
      .limit(1)

    if (!existing) {
      await db.insert(planEntitlements).values(e)
      console.log(`Entitlements for ${e.planCode} created.`)
    } else {
      await db
        .update(planEntitlements)
        .set({ entitlements: e.entitlements })
        .where(eq(planEntitlements.planCode, e.planCode))
      console.log(`Entitlements for ${e.planCode} updated.`)
    }
  }

  // --- ACCOUNT LEVEL SEEDING ---
  const args = process.argv.slice(2)
  const phoneArg = args.find(arg => arg.startsWith('--phone='))
  const targetPhone = phoneArg ? phoneArg.split('=')[1] : null

  let targetTradie: any = null
  if (targetPhone) {
    const [tradie] = await db
      .select()
      .from(tradies)
      .where(eq(tradies.phone, targetPhone))
      .limit(1)
    targetTradie = tradie
    
    if (!targetTradie) {
      console.log(`⚠️ Tradie with phone ${targetPhone} not found.`)
    }
  } else {
    // Get the most recently registered tradie profile
    const [tradie] = await db
      .select()
      .from(tradies)
      .orderBy(desc(tradies.createdAt))
      .limit(1)
    targetTradie = tradie
  }

  if (!targetTradie) {
    // Automatically create and seed the default Dave Plumber account
    targetTradie = await getOrCreateTestUser()
  }

  if (targetTradie) {
    console.log(`🌱 Seeding demo data for tradie: ${targetTradie.firstName} ${targetTradie.lastName} (Phone: ${targetTradie.phone})`)

    // To make seed idempotent and clean, delete existing jobs/invoices/customers for this tradie if they exist
    console.log(`🧹 Cleaning existing demo data for tradie: ${targetTradie.firstName}...`)
    const tradieInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.tradieId, targetTradie.id))
    const invoiceIds = tradieInvoices.map(i => i.id)
    if (invoiceIds.length > 0) {
      await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds))
      await db.delete(invoices).where(inArray(invoices.id, invoiceIds))
    }
    await db.delete(jobs).where(eq(jobs.tradieId, targetTradie.id))
    await db.delete(customers).where(eq(customers.tradieId, targetTradie.id))
    console.log('✓ Cleaned existing demo data.')

    // 1. Create a demo customer
    const [customer] = await db.insert(customers).values({
      tradieId: targetTradie.id,
      name: 'Sarah Jenkins',
      phone: '+61499888777',
      email: 'sarah@example.com',
      address: '45 Bunnings Rd, Fortitude Valley QLD 4006',
      suburb: 'Fortitude Valley',
      state: 'QLD',
      postcode: '4006',
      notes: 'Please check the side gates for entry access.',
      source: 'MANUAL',
    }).returning()

    console.log(`✓ Seeded demo customer: ${customer.name}`)

    // 2. Create demo jobs
    // Job 1: Today upcoming
    const [job1] = await db.insert(jobs).values({
      tradieId: targetTradie.id,
      customerId: customer.id,
      title: 'Kitchen Sink Leaking Repair',
      description: 'Customer reported leaking pipe under kitchen sink.',
      jobType: 'Repair',
      status: 'UPCOMING',
      urgency: 'TODAY',
      scheduledAt: new Date(Date.now() + 2 * 3600 * 1000), // in 2 hours
      estimatedDurationMin: 60,
      address: '45 Bunnings Rd, Fortitude Valley QLD 4006',
      lat: '-27.45678',
      lng: '153.03456',
      notes: 'Bring spare copper pipe fittings.',
    }).returning()

    // Job 2: Today active commute
    const [job2] = await db.insert(jobs).values({
      tradieId: targetTradie.id,
      customerId: customer.id,
      title: 'Install Bathroom Shower Head',
      description: 'Upgrade old shower head to a new rain shower variant.',
      jobType: 'Installation',
      status: 'COMMUTING',
      urgency: 'FLEXIBLE',
      scheduledAt: new Date(Date.now() + 4 * 3600 * 1000),
      estimatedDurationMin: 45,
      address: '12 Queen St, Brisbane City QLD 4000',
      lat: '-27.47012',
      lng: '153.02102',
    }).returning()

    // Job 3: Completed yesterday
    const [job3] = await db.insert(jobs).values({
      tradieId: targetTradie.id,
      customerId: customer.id,
      title: 'Fix Hot Water Valves',
      description: 'Hot water system pressure release valve keeps dripping.',
      jobType: 'Repair',
      status: 'COMPLETED',
      urgency: 'EMERGENCY',
      scheduledAt: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
      estimatedDurationMin: 90,
      address: '99 Sandgate Rd, Clayfield QLD 4011',
      lat: '-27.42011',
      lng: '153.04112',
      completedAt: new Date(Date.now() - 22.5 * 3600 * 1000),
    }).returning()

    console.log('✓ Seeded demo jobs (Upcoming, Commuting, and Completed)')

    // 3. Create Invoices
    // Setup sequence counter
    await db.insert(invoiceSequence).values({
      tradieId: targetTradie.id,
      counter: 2,
    }).onConflictDoUpdate({
      target: invoiceSequence.tradieId,
      set: { counter: 2 }
    })

    // Invoice for completed Job 3 (PAID)
    const [invoice1] = await db.insert(invoices).values({
      tradieId: targetTradie.id,
      jobId: job3.id,
      customerId: customer.id,
      invoiceNumber: 'INV-0001',
      invoicePrefix: 'INV',
      sequenceNumber: 1,
      status: 'PAID',
      subtotalCents: 25500,
      gstCents: 2550,
      totalCents: 28050,
      paidCents: 28050,
      paidAt: new Date(),
      signedAt: new Date(),
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...',
    }).returning()

    await db.insert(invoiceItems).values([
      {
        invoiceId: invoice1.id,
        description: 'Pressure valves 15mm replacement',
        qty: '2.000',
        unitPriceCents: 3500,
        lineTotalCents: 7000,
      },
      {
        invoiceId: invoice1.id,
        description: 'Plumbing Service Labour hour',
        qty: '1.500',
        unitPriceCents: 8500,
        lineTotalCents: 12750,
      },
      {
        invoiceId: invoice1.id,
        description: 'Plumbing Callout Fee',
        qty: '1.000',
        unitPriceCents: 5750,
        lineTotalCents: 5750,
      }
    ])

    // Invoice for commuting Job 2 (DRAFT)
    const [invoice2] = await db.insert(invoices).values({
      tradieId: targetTradie.id,
      jobId: job2.id,
      customerId: customer.id,
      invoiceNumber: 'INV-0002',
      invoicePrefix: 'INV',
      sequenceNumber: 2,
      status: 'DRAFT',
      subtotalCents: 18000,
      gstCents: 1800,
      totalCents: 19800,
    }).returning()

    await db.insert(invoiceItems).values({
      invoiceId: invoice2.id,
      description: 'Bathroom rain shower head standard fixture',
      qty: '1.000',
      unitPriceCents: 18000,
      lineTotalCents: 18000,
    })

    console.log('✓ Seeded demo invoices (Paid & Draft)')
  }

  console.log('🌿 Seeding completed successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
