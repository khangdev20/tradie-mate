import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env'
import { AppError } from '../utils/errors'

const REGION = process.env.AWS_REGION || 'ap-southeast-2'
const BUCKET = process.env.AWS_S3_BUCKET || 'tradiemate-docs'

let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return s3Client
}

function parseBase64Image(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (match) {
    return {
      contentType: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    }
  }
  return {
    contentType: 'image/png',
    buffer: Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
  }
}

export class StorageService {
  static isConfigured(): boolean {
    return getS3Client() !== null
  }

  static async uploadSignature(tradieId: string, invoiceId: string, signatureData: string): Promise<string> {
    if (!signatureData || signatureData.length < 100) {
      throw new AppError('Invalid signature data.', 400, 'INVALID_SIGNATURE')
    }

    const { buffer, contentType } = parseBase64Image(signatureData)
    const key = `signatures/${tradieId}/${invoiceId}.png`
    const client = getS3Client()

    if (!client) {
      if (env.NODE_ENV === 'production') {
        throw new AppError('Signature storage is not configured.', 503, 'STORAGE_UNAVAILABLE')
      }
      return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
    }

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      })
    )

    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
  }
}
