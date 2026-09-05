import { useState, useEffect, useCallback } from 'react'
import api from '../services/apiService'
import { useAuthStore } from '../store/auth.store'

export interface Entitlements {
  maxJobsPerMonth: number
  maxInvoicesPerMonth: number
  tapToPayEnabled: boolean
  customerTrackingEnabled: boolean
  reviewRequestsEnabled: boolean
  xeroSyncEnabled: boolean
  teamMembersLimit: number
  callToJobEnabled: boolean
  aiVoiceEnabled: boolean
}

export interface SubscriptionData {
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'
  planCode: string
  currentPeriodEnd: string | null
  entitlements: Entitlements
  usage: {
    invoicesCreated: number
    jobsCreated: number
  }
}

const DEFAULT_ENTITLEMENTS: Entitlements = {
  maxJobsPerMonth: 10,
  maxInvoicesPerMonth: 5,
  tapToPayEnabled: false,
  customerTrackingEnabled: false,
  reviewRequestsEnabled: false,
  xeroSyncEnabled: false,
  teamMembersLimit: 1,
  callToJobEnabled: false,
  aiVoiceEnabled: false,
}

export function useEntitlements() {
  const { isAuthenticated } = useAuthStore()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/billing/subscription') as any
      if (response && response.success) {
        setSubscription(response.data)
      }
    } catch (err: any) {
      console.error('Failed to load entitlements:', err)
      setError(err.message || 'Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const getEntitlement = <K extends keyof Entitlements>(key: K): Entitlements[K] => {
    if (!subscription) return DEFAULT_ENTITLEMENTS[key]
    return subscription.entitlements[key] ?? DEFAULT_ENTITLEMENTS[key]
  }

  const hasEntitlement = (key: keyof Entitlements): boolean => {
    const val = getEntitlement(key)
    if (typeof val === 'boolean') return val
    if (typeof val === 'number') return val > 0
    return false
  }

  const isLimitReached = (usageKey: 'invoicesCreated' | 'jobsCreated', limitKey: keyof Entitlements): boolean => {
    if (!subscription) return false
    const currentUsage = subscription.usage[usageKey] ?? 0
    const limit = getEntitlement(limitKey)
    if (typeof limit === 'number') {
      return currentUsage >= limit
    }
    return false
  }

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
    getEntitlement,
    hasEntitlement,
    isLimitReached,
  }
}
