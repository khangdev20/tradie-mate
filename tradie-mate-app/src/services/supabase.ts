import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { MMKV } from 'react-native-mmkv'
import { AppConfig } from '../constants/config'

// Encrypted MMKV storage — replaces AsyncStorage
const storage = new MMKV({ id: 'supabase-auth', encryptionKey: 'tradie-key-v1' })

// Custom storage adapter for Supabase
const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}

export const supabase = createClient(
  AppConfig.supabaseUrl,
  AppConfig.supabaseAnonKey,
  {
    auth: {
      storage: mmkvStorageAdapter,
      autoRefreshToken: true,      // silent refresh before expiry
      persistSession: true,        // survive app restarts
      detectSessionInUrl: false,   // not a web app
    },
  }
)

// Export typed session helpers
export type SupabaseSession = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
