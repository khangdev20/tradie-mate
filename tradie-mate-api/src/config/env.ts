import { z } from 'zod'
import 'dotenv/config'

if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/tradiemate_test'
  process.env.DIRECT_DATABASE_URL ??= 'postgres://test:test@localhost:5432/tradiemate_test'
  process.env.SUPABASE_URL ??= 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
  process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters'
  process.env.FIREBASE_PROJECT_ID ??= 'tradiemate-test'
  process.env.FIREBASE_CLIENT_EMAIL ??= 'firebase-admin@tradiemate-test.iam.gserviceaccount.com'
  process.env.FIREBASE_PRIVATE_KEY ??= '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----'
  process.env.STRIPE_SECRET_KEY ??= 'sk_test_tradiemate'
  process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_tradiemate'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.TWILIO_ACCOUNT_SID ??= 'AC00000000000000000000000000000000'
  process.env.TWILIO_AUTH_TOKEN ??= 'test-auth-token'
  process.env.TWILIO_FROM_NUMBER ??= '+61400000000'
  process.env.XERO_CLIENT_ID ??= 'test-xero-client-id'
  process.env.XERO_CLIENT_SECRET ??= 'test-xero-client-secret'
  process.env.ATO_ABN_API_GUID ??= 'test-ato-guid'
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),

  // Database (Drizzle + Supabase)
  DATABASE_URL: z.string().url(),        // Pooled for queries
  DIRECT_DATABASE_URL: z.string().url(), // Direct for migrations

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('tradiemate-docs'),

  // JWT
  JWT_SECRET: z.string().min(32),

  // Firebase
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string(),

  // Stripe (AU)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_AU_ACCOUNT_ID: z.string().optional(),

  // Redis (BullMQ)
  REDIS_URL: z.string().url(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_FROM_NUMBER: z.string().startsWith('+61'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Xero
  XERO_CLIENT_ID: z.string(),
  XERO_CLIENT_SECRET: z.string(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),

  // ATO ABN lookup
  ATO_ABN_API_GUID: z.string(),

  // AWS (S3 + Textract) — bucket optional so local/dev can skip real uploads
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Web + integrations
  WEB_APP_URL: z.string().url().optional(),
  XERO_REDIRECT_URI: z.string().url().optional(),
  VAPI_WEBHOOK_SECRET: z.string().optional(),
  VAPI_DEFAULT_ASSISTANT_ID: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  MAPBOX_SECRET_TOKEN: z.string().optional(),

  // Licence registry APIs (optional per state)
  NSW_LICENCE_API_URL: z.string().url().optional(),
  QLD_LICENCE_API_URL: z.string().url().optional(),
  VIC_LICENCE_API_URL: z.string().url().optional(),
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2))
  process.exit(1)
}

export const env = result.data
export type Env = z.infer<typeof envSchema>
