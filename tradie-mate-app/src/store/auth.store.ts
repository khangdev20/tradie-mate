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
  firstName: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  activeProvider: AuthProvider | null

  // Onboarding State
  isOnboarded: boolean
  onboardingStatus: string | null
  resumeStep: string | null
  onboardingBlockers: string[]
  requiredDocuments: string[]
  uploadedDocuments: Array<{ doc_type: string; status: string; expires_at?: string }>

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
  submitOnboardingProfile: (data: any) => Promise<void>
  uploadOnboardingDocument: (docType: string, file: any) => Promise<void>
  fetchOnboardingStatus: () => Promise<void>
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const unwrapApiData = <T = any>(response: any): T => {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return response.data as T
  }
  return response as T
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:         null,
  tradieId:        TokenStorage.getTradieId(),
  firstName:       TokenStorage.getFirstName(),
  isLoading:       false,
  isAuthenticated: !!TokenStorage.getAccessToken(),
  error:           null,
  activeProvider:  null,

  // Onboarding Initial State
  isOnboarded:        false,
  onboardingStatus:   null,
  resumeStep:         null,
  onboardingBlockers: [],
  requiredDocuments:  [],
  uploadedDocuments:  [],

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
        result = unwrapApiData(await api.post('/auth/otp/verify', {
          phone: normalised, otp,
        }) as any)

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

        result = unwrapApiData(await api.post('/auth/otp/verify', {
          phone: normalised, otp,
        }) as any)
      }

      TokenStorage.saveSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_at:    session.expires_at!,
        tradie_id:     result.tradie_id ?? '',
        first_name:    result.first_name ?? '',
      })

      set({ session, isAuthenticated: true, tradieId: result.tradie_id, firstName: result.first_name ?? null, activeProvider: 'phone' })
      
      if (result.tradie_id) {
        await get().fetchOnboardingStatus()
      }

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
      const result = unwrapApiData(await api.post('/auth/oauth/callback', {
        provider: 'google',
        id_token: idToken,
      }) as any)

      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id ?? '',
      })

      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'google' })
      
      if (result.tradie_id) {
        await get().fetchOnboardingStatus()
      }

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
      const result = unwrapApiData(await api.post('/auth/oauth/callback', {
        provider: 'apple',
        id_token: identityToken,
        full_name: fullName ? `${fullName.givenName} ${fullName.familyName}` : null,
        email,
      }) as any)

      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id ?? '',
      })

      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'apple' })
      
      if (result.tradie_id) {
        await get().fetchOnboardingStatus()
      }

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
      const result = unwrapApiData(await api.post('/auth/email/login', { email, password }) as any)
      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id,
        first_name:    result.first_name ?? '',
      })
      set({ isAuthenticated: true, tradieId: result.tradie_id, firstName: result.first_name ?? null, activeProvider: 'email' })
      
      if (result.tradie_id) {
        await get().fetchOnboardingStatus()
      }
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
      const result = unwrapApiData(await api.post('/auth/email/register', data) as any)
      TokenStorage.saveSession({
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + result.expires_in,
        tradie_id:     result.tradie_id,
      })
      set({ isAuthenticated: true, tradieId: result.tradie_id, activeProvider: 'email' })
      
      if (result.tradie_id) {
        await get().fetchOnboardingStatus()
      }
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
    // For backwards compatibility, route to completeProfile but we will use submitOnboardingProfile primarily
    await get().submitOnboardingProfile(data)
  },

  submitOnboardingProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const payload = {
        ...data,
        legal_consent: {
          terms_version: '2026-06-02',
          privacy_version: '2026-06-02',
          disclaimer_version: '2026-06-02',
          accepted_at: new Date().toISOString(),
        }
      }
      const result = unwrapApiData(await api.post('/onboarding/profile', payload))
      
      if (result.tradie_id) {
        TokenStorage.saveSession({
          access_token:  TokenStorage.getAccessToken()!,
          refresh_token: TokenStorage.getRefreshToken()!,
          expires_at:    Math.floor(Date.now() / 1000) + 3600,
          tradie_id:     result.tradie_id,
        })
        set({ tradieId: result.tradie_id })
      }
      
      await get().fetchOnboardingStatus()
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  uploadOnboardingDocument: async (docType, file) => {
    set({ isLoading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('documentType', docType)
      formData.append('file', {
        uri: file.uri,
        name: file.name || `${docType.toLowerCase()}.jpg`,
        type: file.type || 'image/jpeg',
      } as any)

      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      await get().fetchOnboardingStatus()
    } catch (err: any) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  fetchOnboardingStatus: async () => {
    try {
      const result = unwrapApiData(await api.get('/onboarding/status'))
      set({
        isOnboarded:        result.can_access_app,
        onboardingStatus:   result.onboarding_status,
        resumeStep:         result.resume_step,
        onboardingBlockers: result.blockers || [],
        requiredDocuments:  result.required_documents || [],
        uploadedDocuments:  result.documents || [],
      })
    } catch (err: any) {
      // If 403 or 401, they are not onboarded or unauthorized. 
      // Let's just catch and not crash.
      console.warn('Fetch onboarding status failed:', err.message)
    }
  },

  refreshSession: async () => {
    const refreshToken = TokenStorage.getRefreshToken()
    if (!refreshToken) {
      await get().logout()
      throw new Error('No refresh token')
    }

    if (__DEV__ && refreshToken.startsWith('mock-refresh-token')) {
      // Extend the mock expiry so an expired development session does not
      // recurse back into refreshSession on the next request.
      const accessToken = TokenStorage.getAccessToken()
      if (accessToken) {
        TokenStorage.saveSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
          expires_at:    Math.floor(Date.now() / 1000) + 3600,
          tradie_id:     TokenStorage.getTradieId() ?? '',
        })
      }
      return
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })
    if (error || !data.session) {
      await get().logout()
      throw new Error(error?.message || 'Refresh failed')
    }

    TokenStorage.saveSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at!,
      tradie_id:     TokenStorage.getTradieId() ?? '',
    })
    set({ session: data.session })
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
    set({ 
      session: null, 
      tradieId: null, 
      firstName: null, 
      isAuthenticated: false, 
      activeProvider: null,
      isOnboarded: false,
      onboardingStatus: null,
      resumeStep: null,
      onboardingBlockers: [],
      requiredDocuments: [],
      uploadedDocuments: [],
    })
  },

  clearError: () => set({ error: null }),
}))
