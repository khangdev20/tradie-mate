import { MMKV } from 'react-native-mmkv'

// In a real app, this should be securely generated and stored in the keychain
const ENCRYPTION_KEY = 'tradie-auth-secure-key-v1'

const authStorage = new MMKV({
  id: 'auth-tokens',
  encryptionKey: ENCRYPTION_KEY,
})

export const TokenStorage = {
  // Store after successful OTP verify or refresh
  saveSession: (session: {
    access_token: string
    refresh_token: string
    expires_at: number  // Unix timestamp
    tradie_id: string
  }) => {
    authStorage.set('access_token', session.access_token)
    authStorage.set('refresh_token', session.refresh_token)
    authStorage.set('expires_at', String(session.expires_at))
    authStorage.set('tradie_id', session.tradie_id)
  },

  getAccessToken: () => authStorage.getString('access_token') ?? null,
  getRefreshToken: () => authStorage.getString('refresh_token') ?? null,
  getTradieId: () => authStorage.getString('tradie_id') ?? null,

  isExpired: () => {
    const expiresAt = authStorage.getString('expires_at')
    if (!expiresAt) return true
    // Refresh 5 minutes before actual expiry
    return Date.now() / 1000 > Number(expiresAt) - 300
  },

  clearSession: () => {
    authStorage.delete('access_token')
    authStorage.delete('refresh_token')
    authStorage.delete('expires_at')
    authStorage.delete('tradie_id')
  },

  hasBiometricEnabled: () =>
    authStorage.getBoolean('biometric_enabled') ?? false,

  setBiometricEnabled: (val: boolean) =>
    authStorage.set('biometric_enabled', val),
}
