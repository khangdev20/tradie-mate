import React from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootNavigator } from './navigation/RootNavigator'
import { setupSessionRefresh } from '../services/sessionRefresh'
import { initializeStripe } from '../services/stripe'
import {
  registerDeviceForPushNotifications,
  setupFCMHandlers,
  setupNotificationChannels,
} from '../services/notifications'
import { useOfflineQueueStore } from '../hooks/useOfflineQueue'
import { useNetworkState } from '../hooks/useNetworkState'
import { useAuthStore } from '../store/auth.store'

const queryClient = new QueryClient()

import Mapbox from '@rnmapbox/maps'
import { AppConfig } from '../constants/config'

Mapbox.setAccessToken(AppConfig.mapboxAccessToken)

export default function App() {
  const { isConnected, setStatus } = useNetworkState()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const queueLength = useOfflineQueueStore((state) => state.queue.length)
  const syncQueue = useOfflineQueueStore((state) => state.syncQueue)

  React.useEffect(() => {
    const cleanup = setupSessionRefresh()
    return () => cleanup()
  }, [])

  React.useEffect(() => {
    initializeStripe().catch((error) => {
      console.warn('Stripe initialization failed:', error)
    })
  }, [])

  React.useEffect(() => {
    setupNotificationChannels().catch((error) => {
      console.warn('Notification channel setup failed:', error)
    })

    const unsubscribe = setupFCMHandlers()
    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated) return

    registerDeviceForPushNotifications().catch((error) => {
      console.warn('Push notification registration failed:', error)
    })
  }, [isAuthenticated])

  React.useEffect(() => {
    if (!isConnected || queueLength === 0) return

    let cancelled = false
    setStatus('syncing')
    syncQueue()
      .catch((error) => {
        console.warn('Offline sync failed:', error)
      })
      .finally(() => {
        if (!cancelled) {
          setStatus('online')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isConnected, queueLength, setStatus, syncQueue])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
