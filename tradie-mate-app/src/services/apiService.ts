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

// Request interceptor — attach token + refresh if expired
api.interceptors.request.use(async (config) => {
  // Skip auth for public endpoints
  const publicPaths = ['/auth/otp/send', '/auth/otp/verify',
                       '/auth/refresh', '/track/']
  const isPublic = publicPaths.some(p => config.url?.includes(p))
  if (isPublic) return config

  // Refresh if token expiring in < 5 minutes
  if (TokenStorage.isExpired()) {
    const { useAuthStore } = require('../store/auth.store') as { useAuthStore: typeof useAuthStoreType }
    await useAuthStore.getState().refreshSession()
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
        const { useAuthStore } = require('../store/auth.store') as { useAuthStore: typeof useAuthStoreType }
        await useAuthStore.getState().refreshSession()
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
