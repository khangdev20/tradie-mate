import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { tradeDocuments } from '../../db/schema/documents'
import { redisConnection } from '../../config/redis'
import { AppError } from '../../utils/errors'
import path from 'path'
import crypto from 'crypto'
import { Queue } from 'bullmq'
import { eq } from 'drizzle-orm'
import { uploadToS3 } from '../../services/s3.service'

// Allowed document types matching the enum
const VALID_DOC_TYPES = [
  'TRADE_LICENCE',
  'PUBLIC_LIABILITY_INSURANCE',
  'WHITE_CARD',
  'POLICE_CHECK',
  'WORKERS_COMPENSATION',
  'OTHER',
] as const

type DocType = typeof VALID_DOC_TYPES[number]

// Max file size: 20 MB
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export async function documentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  /**
   * POST /api/v1/documents/upload
   * Uploads a tradie's compliance document (licence, insurance, white card, etc.)
   * to S3 and queues async OCR verification.
   *
   * Content-Type: multipart/form-data
   * Fields:
   *   - file: binary document file
   *   - documentType: one of VALID_DOC_TYPES
   */
  fastify.post('/upload', async (request: FastifyRequest, reply) => {
    const tradieId = request.tradie.id

    // Parse multipart form
    const data = await request.file()
    if (!data) {
      throw new AppError('No file uploaded.', 400, 'MISSING_FILE')
    }

    // Validate documentType field
    const documentType = (data.fields?.documentType as any)?.value as DocType
    if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
      throw new AppError(
        `documentType must be one of: ${VALID_DOC_TYPES.join(', ')}`,
        400,
        'INVALID_DOCUMENT_TYPE'
      )
    }

    // Check MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedMimes.includes(data.mimetype)) {
      throw new AppError(
        'File must be JPEG, PNG, WEBP, or PDF.',
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    }

    // Read file buffer with size cap
    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE_BYTES) {
        throw new AppError('File exceeds maximum allowed size of 20 MB.', 413, 'FILE_TOO_LARGE')
      }
      chunks.push(chunk as Buffer)
    }
    const fileBuffer = Buffer.concat(chunks)
    const fileSizeBytes = fileBuffer.length

    const ext = path.extname(data.filename || '').toLowerCase() || mimeToExt(data.mimetype)
    const storagePath = `documents/${tradieId}/${documentType}/${crypto.randomUUID()}${ext}`

    let storageUrl = ''

    // Upload to S3 (ap-southeast-2) if AWS credentials are available
    try {
      storageUrl = await uploadToS3(storagePath, fileBuffer, data.mimetype)
    } catch (s3Err) {
      fastify.log.error({ s3Err, storagePath }, 'S3 upload failed')
      throw new AppError('File storage failed. Please try again.', 502, 'STORAGE_ERROR')
    }

    // Create DB record with PENDING status
    const [doc] = await db
      .insert(tradeDocuments)
      .values({
        tradieId,
        docType: documentType,
        status: 'PENDING',
        storageUrl,
        storagePath,
        mimeType: data.mimetype,
        fileSizeBytes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Queue async OCR/verification (best-effort)
    try {
      const ocrQueue = new Queue('document-ocr', { connection: redisConnection })
      await ocrQueue.add('verify', { documentId: doc.id, tradieId, storageUrl, documentType }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      })
    } catch (queueErr) {
      fastify.log.warn({ queueErr, docId: doc.id }, 'OCR queue not available — document will remain PENDING')
    }

    return reply.status(202).send({
      success: true,
      data: {
        documentId: doc.id,
        status: doc.status,
        fileUrl: storageUrl,
      },
    })
  })

  /**
   * GET /api/v1/documents
   * List all documents for the authenticated tradie.
   */
  fastify.get('/', async (request) => {
    const tradieId = request.tradie.id

    const docs = await db
      .select()
      .from(tradeDocuments)
      .where(eq(tradeDocuments.tradieId, tradieId))
      .orderBy(tradeDocuments.createdAt)

    return {
      success: true,
      data: { documents: docs },
    }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  }
  return map[mime] ?? ''
}
