import { z } from 'zod'
import 'dotenv/config'

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
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2))
  process.exit(1)
}

export const env = result.data
export type Env = z.infer<typeof envSchema>
