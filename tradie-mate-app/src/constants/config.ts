// src/constants/config.ts
import Config from 'react-native-config'

export const AppConfig = {
  apiUrl:              Config.API_URL || 'http://localhost:3000',
  supabaseUrl:         Config.SUPABASE_URL || '',
  supabaseAnonKey:     Config.SUPABASE_ANON_KEY || '',
  stripePublishableKey: Config.STRIPE_PUBLISHABLE_KEY || '',
  mapboxAccessToken:   Config.MAPBOX_ACCESS_TOKEN || '',
  sentryDsn:           Config.SENTRY_DSN || '',
  environment:         Config.NODE_ENV ?? 'development',
}
