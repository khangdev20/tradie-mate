import axios, { AxiosInstance } from 'axios'
import { TokenStorage } from './tokenStorage'
import { AppConfig } from '../constants/config'
import type { useAuthStore as useAuthStoreType } from '../store/auth.store'

declare var require: any

const api: AxiosInstance = axios.create({
  baseURL: AppConfig.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const PUBLIC_PATHS = ['/auth/otp/send', '/auth/otp/verify', '/auth/refresh', '/track/']

function isPublicPath(url?: string): boolean {
  return PUBLIC_PATHS.some((path) => url?.includes(path))
}

let refreshPromise: Promise<void> | null = null

async function refreshAuthToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { useAuthStore } = require('../store/auth.store') as { useAuthStore: typeof useAuthStoreType }
      await useAuthStore.getState().refreshSession()
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// Request interceptor — attach token + refresh if expired
api.interceptors.request.use(async (config) => {
  if (isPublicPath(config.url)) return config

  if (TokenStorage.isExpired()) {
    await refreshAuthToken()
  }

  const token = TokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Response interceptor — handle 401 with retry
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await refreshAuthToken()
        const newToken = TokenStorage.getAccessToken()
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        const { useAuthStore } = require('../store/auth.store') as { useAuthStore: typeof useAuthStoreType }
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Format error for UI
    const apiError = error.response?.data?.error
    const message =
      (typeof apiError === 'string' ? apiError : apiError?.message) ??
      error.response?.data?.message ??
      error.message ??
      'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export default api
