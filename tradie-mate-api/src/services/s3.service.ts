import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.AWS_REGION || 'ap-southeast-2'
const bucket = process.env.AWS_S3_BUCKET || 'tradiemate-docs'

function getClient(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null
  }
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  const client = getClient()
  if (!client) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

export async function getSignedS3Url(key: string, expiresIn = 3600): Promise<string> {
  const client = getClient()
  if (!client) return `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  )
}

export async function downloadFromS3Url(storageUrl: string): Promise<Buffer> {
  const client = getClient()
  if (!client) {
    throw new Error('S3 not configured')
  }

  const url = new URL(storageUrl)
  const key = url.pathname.slice(1)

  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const bytes = await res.Body?.transformToByteArray()
  if (!bytes) throw new Error('Empty S3 object')
  return Buffer.from(bytes)
}
