import { TextractClient, AnalyzeDocumentCommand, FeatureType } from '@aws-sdk/client-textract'
import { downloadFromS3Url } from './s3.service'

const client = process.env.AWS_ACCESS_KEY_ID
  ? new TextractClient({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null

export type OcrResult = {
  licenceNumber?: string
  holderName?: string
  expiryDate?: string
  confidence: number
  rawText: string
}

export async function extractDocumentFields(storageUrl: string, documentType: string): Promise<OcrResult> {
  if (!client) {
    return {
      confidence: 0,
      rawText: '',
    }
  }

  const bytes = await downloadFromS3Url(storageUrl)
  const res = await client.send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: bytes },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
    }),
  )

  const lines = (res.Blocks || [])
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => b.Text!)
  const rawText = lines.join('\n')

  const licenceMatch = rawText.match(/(?:licence|license|no\.?)\s*[:#]?\s*([A-Z0-9\-/]+)/i)
  const expiryMatch = rawText.match(/(?:expir(?:y|es)|valid until)\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)

  return {
    licenceNumber: licenceMatch?.[1],
    holderName: lines[0],
    expiryDate: expiryMatch?.[1],
    confidence: lines.length > 3 ? 0.85 : 0.5,
    rawText,
  }
}

export function evaluateOcrForDocumentType(ocr: OcrResult, documentType: string): 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED' {
  if (!ocr.rawText && ocr.confidence === 0) return 'UNDER_REVIEW'
  if (documentType === 'TRADE_LICENCE' && ocr.licenceNumber) return 'VERIFIED'
  if (ocr.confidence >= 0.7) return 'VERIFIED'
  if (ocr.confidence >= 0.4) return 'UNDER_REVIEW'
  return 'REJECTED'
}
