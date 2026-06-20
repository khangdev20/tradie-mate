import {
  pgTable, uuid, text, boolean, integer,
  decimal, timestamp, varchar, index, unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradeTypeEnum } from './enums'

export const tradies = pgTable('tradies', {
  id:                uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  authUserId:        uuid('auth_user_id').notNull().unique(),

  // Personal
  firstName:         text('first_name').notNull(),
  lastName:          text('last_name').notNull(),
  phone:             varchar('phone', { length: 20 }).unique(), // optional if using email/SSO
  email:             varchar('email', { length: 255 }).unique(),
  emailVerifiedAt:   timestamp('email_verified_at', { withTimezone: true }),
  avatarUrl:         text('avatar_url'),
  bio:               varchar('bio', { length: 150 }),

  // Auth flags
  hasPassword:       boolean('has_password').default(false).notNull(),
  googleId:          text('google_id').unique(),
  appleId:           text('apple_id').unique(),

  // Business
  businessName:      text('business_name'),
  abn:               varchar('abn', { length: 11 }).unique(),
  abnVerifiedAt:     timestamp('abn_verified_at', { withTimezone: true }),
  abnEntityName:     text('abn_entity_name'),
  abnGstRegistered:  boolean('abn_gst_registered').default(false).notNull(),
  abnVerificationStatus: varchar('abn_verification_status', { length: 40 }).default('UNVERIFIED').notNull(),
  tradeType:         tradeTypeEnum('trade_type').notNull(),
  tradeSpecialties:  text('trade_specialties').array().default(sql`'{}'`),
  experienceYears:   varchar('experience_years', { length: 20 }),
  hasPublicLiabilityDeclared: boolean('has_public_liability_declared'),

  // Rates — INTEGER CENTS
  hourlyRateCents:   integer('hourly_rate_cents'),
  hourlyRatePublic:  boolean('hourly_rate_public').default(false).notNull(),
  calloutFeeCents:   integer('callout_fee_cents'),

  // Availability
  availableNow:      boolean('available_now').default(true).notNull(),
  busyUntil:         timestamp('busy_until', { withTimezone: true }),
  emergencyCallouts: boolean('emergency_callouts').default(true).notNull(),
  weekendWork:       boolean('weekend_work').default(true).notNull(),
  afterHoursWork:    boolean('after_hours_work').default(false).notNull(),

  // Service area
  serviceRadiusKm:   integer('service_radius_km').default(25).notNull(),
  serviceAreaLat:    decimal('service_area_lat', { precision: 10, scale: 7 }),
  serviceAreaLng:    decimal('service_area_lng', { precision: 10, scale: 7 }),
  serviceSuburbs:    text('service_suburbs').array().default(sql`'{}'`),

  // Vehicle (customer tracking screen)
  vehicleMake:       text('vehicle_make'),
  vehicleModel:      text('vehicle_model'),
  vehicleColor:      text('vehicle_color'),
  vehiclePlate:      text('vehicle_plate'),

  // Twilio (call automation)
  twilioNumber:      varchar('twilio_number', { length: 20 }).unique(),
  callRecordingEnabled: boolean('call_recording_enabled').default(false).notNull(),

  // FCM push notifications
  fcmToken:          text('fcm_token'),
  fcmTokenUpdatedAt: timestamp('fcm_token_updated_at', { withTimezone: true }),

  // Denormalized stats
  totalJobsCompleted: integer('total_jobs_completed').default(0).notNull(),
  avgRating:          decimal('avg_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  totalReviews:       integer('total_reviews').default(0).notNull(),
  avgResponseTimeMin: integer('avg_response_time_min'),

  // Onboarding state machine
  onboardingStatus:  varchar('onboarding_status', { length: 40 }).default('PHONE_PENDING').notNull(),
  betaApprovedAt:    timestamp('beta_approved_at', { withTimezone: true }),

  // Verification
  licenceVerified:   boolean('licence_verified').default(false).notNull(),
  insuranceVerified: boolean('insurance_verified').default(false).notNull(),
  isActive:          boolean('is_active').default(true).notNull(),
  isOnboarded:       boolean('is_onboarded').default(false).notNull(),

  // Legal consent (Terms, Privacy, Verification Disclaimer)
  termsAcceptedAt:       timestamp('terms_accepted_at', { withTimezone: true }),
  termsVersion:          varchar('terms_version', { length: 32 }),
  privacyAcceptedAt:     timestamp('privacy_accepted_at', { withTimezone: true }),
  privacyVersion:        varchar('privacy_version', { length: 32 }),
  disclaimerAcceptedAt:  timestamp('disclaimer_accepted_at', { withTimezone: true }),
  disclaimerVersion:     varchar('disclaimer_version', { length: 32 }),

  createdAt:         timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt:         timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('tradies_auth_user_idx').on(table.authUserId),
  index('tradies_trade_type_idx').on(table.tradeType),
  index('tradies_location_idx').on(table.serviceAreaLat, table.serviceAreaLng),
  index('tradies_active_idx').on(table.isActive, table.licenceVerified),
])

// Onboarding audit events
export const onboardingEvents = pgTable('onboarding_events', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:  uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  step:      varchar('step', { length: 50 }).notNull(),
  metadata:  text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('onboarding_events_tradie_idx').on(table.tradieId),
  index('onboarding_events_step_idx').on(table.step),
])

// Track which auth methods a tradie has linked
export const tradieAuthMethods = pgTable('tradie_auth_methods', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:  uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),

  provider:   text('provider').notNull(), // 'phone' | 'google' | 'apple' | 'email'
  providerId: text('provider_id').notNull(), // provider's user ID (Supabase user ID)
  email:      text('email'),
  phone:      text('phone'),
  isPrimary:  boolean('is_primary').default(false).notNull(),

  createdAt:  timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (table) => [
  unique('tradie_provider_unique').on(table.tradieId, table.provider),
  index('auth_methods_tradie_idx').on(table.tradieId),
  index('auth_methods_provider_idx').on(table.provider, table.providerId),
])
