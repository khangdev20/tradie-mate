import { FastifyReply, FastifyRequest } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { tradeDocuments } from '../../db/schema/documents'
import { ABNService } from '../../services/abn.service'
import { OnboardingService } from '../../services/onboarding.service'
import { env } from '../../config/env'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const P0_DOC_TYPES = ['TRADE_LICENCE', 'PUBLIC_LIABILITY_INSURANCE']

// ─── POST /onboarding/profile ───────────────────────────────────────────────

export const completeProfileHandler = async (
  request: FastifyRequest<any>,
  reply: FastifyReply,
) => {
  const authUserId = (request.user as any).id
  const body = request.body as any

  try {
    const result = await OnboardingService.completeProfile({
      authUserId,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      trade_type: body.trade_type,
      business_name: body.business_name,
      abn: body.abn,
      has_public_liability: body.has_public_liability,
      experience_years: body.experience_years,
      legal_consent: body.legal_consent,
    })

    const statusCode = result.already_existed ? 200 : 201
    return reply.status(statusCode).send({
      success: true,
      data: {
        tradie_id: result.tradie_id,
        onboarding_status: result.onboarding_status,
        abn_entity_name: result.abn_entity_name,
        abn_verification_status: result.abn_verification_status,
        next_url: result.next_url,
      },
    })
  } catch (err: any) {
    const status = err.status || 500
    return reply.status(status).send({
      success: false,
      error: err.message,
      code: err.code || 'ONBOARDING_ERROR',
    })
  }
}

// ─── GET /onboarding/status ──────────────────────────────────────────────────

export const getOnboardingStatusHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const authUserId = (request.user as any).id

  const result = await OnboardingService.getStatus(authUserId)
  return reply.send({ success: true, data: result })
}

// ─── POST /onboarding/abn/validate ──────────────────────────────────────────

export const validateAbnHandler = async (
  request: FastifyRequest<any>,
  reply: FastifyReply,
) => {
  const { abn } = request.body as { abn: string }
  const cleanAbn = ABNService.clean(abn)

  if (!ABNService.validateLuhn(cleanAbn)) {
    return reply.send({
      success: true,
      data: { valid: false, active: false, entity_name: null, gst_registered: false, cached: false },
    })
  }

  const details = await ABNService.lookup(cleanAbn)

  if (!details) {
    // ABR down — return soft error so UI can show amber banner
    return reply.status(503).send({
      success: false,
      error: 'Australian Business Register is temporarily unavailable',
      code: 'ABR_UNAVAILABLE',
    })
  }

  return reply.send({
    success: true,
    data: {
      valid: true,
      active: details.active,
      entity_name: details.entityName,
      gst_registered: details.gstRegistered,
      cached: false,
    },
  })
}

// ─── POST /documents/upload ──────────────────────────────────────────────────

export const uploadDocumentHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const tradie = request.tradie
  if (!tradie) {
    return reply.status(403).send({
      success: false,
      error: 'Tradie profile required to upload documents',
      code: 'TRADIE_NOT_FOUND',
    })
  }

  // Parse multipart
  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ success: false, error: 'No file uploaded', code: 'NO_FILE' })
  }

  const docType = data.fields['doc_type'] as any
  const docTypeValue = (docType as any)?.value ?? docType

  if (!P0_DOC_TYPES.includes(docTypeValue)) {
    return reply.status(400).send({
      success: false,
      error: `doc_type must be one of: ${P0_DOC_TYPES.join(', ')}`,
      code: 'INVALID_DOC_TYPE',
    })
  }

  const mime = data.mimetype
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return reply.status(400).send({
      success: false,
      error: 'File must be PDF, JPG, or PNG',
      code: 'INVALID_FILE_TYPE',
    })
  }

  // Read file into buffer and check size
  const chunks: Buffer[] = []
  for await (const chunk of data.file) {
    chunks.push(chunk as Buffer)
  }
  const fileBuffer = Buffer.concat(chunks)

  if (fileBuffer.length > MAX_FILE_BYTES) {
    return reply.status(413).send({
      success: false,
      error: 'File too large — maximum 10 MB',
      code: 'FILE_TOO_LARGE',
    })
  }

  let storageUrl: string | null = null
  let storagePath: string | null = null

  // Upload to S3 (skip in dev if no bucket configured)
  if (env.AWS_S3_BUCKET) {
    const s3 = new S3Client({ region: env.AWS_REGION || 'ap-southeast-2' })
    const fileExt = mime === 'application/pdf' ? 'pdf' : mime.includes('png') ? 'png' : 'jpg'
    const key = `documents/${tradie.id}/${docTypeValue}/${randomUUID()}.${fileExt}`

    await s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: mime,
      }),
    )

    storagePath = key
    storageUrl = `https://${env.AWS_S3_BUCKET}.s3.ap-southeast-2.amazonaws.com/${key}`
  }

  // Insert trade_documents row (upsert by tradie + doc_type — replace if re-upload)
  const [existingDoc] = await db
    .select({ id: tradeDocuments.id })
    .from(tradeDocuments)
    .where(and(
      eq(tradeDocuments.tradieId, tradie.id),
      eq(tradeDocuments.docType, docTypeValue as any),
    ))

  let documentId: string

  if (existingDoc) {
    // Update existing
    await db
      .update(tradeDocuments)
      .set({
        status: 'PENDING',
        storageUrl: storageUrl ?? undefined,
        storagePath: storagePath ?? undefined,
        mimeType: mime,
        fileSizeBytes: fileBuffer.length,
        updatedAt: new Date(),
        verifiedAt: undefined,
        rejectionReason: undefined,
      })
      .where(eq(tradeDocuments.id, existingDoc.id))
    documentId = existingDoc.id
  } else {
    const [doc] = await db
      .insert(tradeDocuments)
      .values({
        tradieId: tradie.id,
        docType: docTypeValue,
        status: 'PENDING',
        storageUrl: storageUrl ?? undefined,
        storagePath: storagePath ?? undefined,
        mimeType: mime,
        fileSizeBytes: fileBuffer.length,
      })
      .returning()
    documentId = doc.id
  }

  // Refresh onboarding status
  await OnboardingService.refreshDocumentStatus(tradie.id)

  return reply.status(202).send({
    success: true,
    data: {
      document_id: documentId,
      doc_type: docTypeValue,
      status: 'PENDING',
      file_size_bytes: fileBuffer.length,
    },
  })
}
