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
import { useAuthStore } from '../store/auth.store'
import { useAutoSync } from '../hooks/useAutoSync'

const queryClient = new QueryClient()

import Mapbox from '@rnmapbox/maps'
import { AppConfig } from '../constants/config'

Mapbox.setAccessToken(AppConfig.mapboxAccessToken)

function AppContent() {
  useAutoSync()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

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

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
