import { create } from 'zustand'
import { supabase, SupabaseSession } from '../services/supabase'
import { TokenStorage } from '../services/tokenStorage'
import api from '../services/apiService'
import { signInWithGoogle, signOutGoogle } from '../services/auth/googleAuth'
import { signInWithApple } from '../services/auth/appleAuth'

type AuthProvider = 'phone' | 'google' | 'apple' | 'email'

interface RegisterData {
  first_name: string
  last_name: string
  trade_type: "PLUMBER" | "ELECTRICIAN" | "CARPENTER" | "HVAC" | "PAINTER" | "TILER" | "ROOFER" | "OTHER"
  abn?: string
}

interface EmailRegisterData extends RegisterData {
  email: string
  password: string
}

interface AuthState {
  // State
  session: SupabaseSession | null
  tradieId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  activeProvider: AuthProvider | null

  // Actions
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, otp: string) => Promise<{
    is_new_user: boolean
    tradie_id: string | null
  }>
  
  loginWithGoogle: () => Promise<{ is_new_user: boolean; tradie_id: string | null }>
  loginWithApple: () => Promise<{ is_new_user: boolean; tradie_id: string | null }>
  
  loginWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (data: EmailRegisterData) => Promise<void>
  forgotPassword: (email: string) => Promise<void>

  register: (data: RegisterData) => Promise<void>
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:         null,
  tradieId:        TokenStorage.getTradieId(),
  isLoading:       false,
  isAuthenticated: !!TokenStorage.getAccessToken(),
  error:           null,
  activeProvider:  null,

  sendOtp: async (phone) => {
    set({ isLoading: true, error: null })
    try {
      const normalised = phone.startsWith('0') ? '+61' + phone.slice(1) : phone
      
      // Dev mode test phone mock bypass
      if (__DEV__ && normalised === '+61412345678') {
        return
      }

      const { error } = await supabase.auth.signInWithOtp({ phone: normalised })
      if (error) throw error
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true, error: null })
    try {
      const normalised = phone.startsWith('0') ? '+61' + phone.slice(1) : phone
      
      let session: any = null
      let result: any = null

      if (__DEV__ && normalised === '+61412345678' && otp === '123456') {
        result = await api.post('/auth/otp/verify', {
          phone: normalised, otp,
        }) as any

        session = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + result.expires_in,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'test@tradiemate.com',
            phone: normalised,
          }
        }
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: normalised,
          token: otp,
          type:  'sms',
        })
        if (error) throw error
        session = data.session!

        result = await api.post('/auth/otp/verify', {
          phone: normalised, otp,
        }) as any
      }

      TokenStorage.saveSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_at:    session.expires_at!,
        tradie_id:     result.tradie_id ?? '',
      })

      set({ session, isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'phone' })
      return { is_new_user: result.is_new_user, tradie_id: result.tradie_id }

    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const { idToken } = await signInWithGoogle()
      const result = await api.post('/auth/oauth/callback', {
        provider: 'google',
        id_token: idToken,
      }) as any

      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id ?? '',
      })

      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'google' })
      return { is_new_user: result.is_new_user, tradie_id: result.tradie_id }
    } catch (err: any) {
      if (err.code === 'SIGN_IN_CANCELLED') return { is_new_user: false, tradie_id: null }
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true, error: null })
    try {
      const { identityToken, fullName, email } = await signInWithApple()
      const result = await api.post('/auth/oauth/callback', {
        provider: 'apple',
        id_token: identityToken,
        full_name: fullName ? `${fullName.givenName} ${fullName.familyName}` : null,
        email,
      }) as any

      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id ?? '',
      })

      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'apple' })
      return { is_new_user: result.is_new_user, tradie_id: result.tradie_id }
    } catch (err: any) {
      if (err.code === '1001') return { is_new_user: false, tradie_id: null } // user cancelled
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = await api.post('/auth/email/login', { email, password }) as any
      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id,
      })
      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'email' })
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  registerWithEmail: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const result = await api.post('/auth/email/register', data) as any
      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id,
      })
      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'email' })
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null })
    try {
      await api.post('/auth/email/forgot-password', { email })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const result = await api.post('/tradies/register', data) as any
      TokenStorage.saveSession({
        access_token:  TokenStorage.getAccessToken()!,
        refresh_token: TokenStorage.getRefreshToken()!,
        expires_at:    Math.floor(Date.now() / 1000) + 3600,
        tradie_id:     result.tradie_id,
      })
      set({ tradieId: result.tradie_id })
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  refreshSession: async () => {
    try {
      const refreshToken = TokenStorage.getRefreshToken()
      if (!refreshToken) { get().logout(); return }

      if (__DEV__ && refreshToken.startsWith('mock-refresh-token')) {
        return
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      })
      if (error || !data.session) { get().logout(); return }

      TokenStorage.saveSession({
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at:    data.session.expires_at!,
        tradie_id:     TokenStorage.getTradieId()!,
      })
      set({ session: data.session })
    } catch {
      get().logout()
    }
  },

  logout: async () => {
    try {
      const refreshToken = TokenStorage.getRefreshToken()
      if (!(__DEV__ && refreshToken?.startsWith('mock-refresh-token'))) {
        await supabase.auth.signOut()
      }
      if (get().activeProvider === 'google') await signOutGoogle()
    } catch {}
    TokenStorage.clearSession()
    set({ session: null, tradieId: null, isAuthenticated: false, activeProvider: null })
  },

  clearError: () => set({ error: null }),
}))
