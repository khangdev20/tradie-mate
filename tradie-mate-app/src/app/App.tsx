import React from 'react'
import { StatusBar, Linking } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import * as Sentry from '@sentry/react-native'
import { i18n } from '../i18n'
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
import { trackEvent } from '../services/analytics'
import api from '../services/apiService'
import { AppConfig } from '../constants/config'
import '../offline/database'

const queryClient = new QueryClient()

import Mapbox from '@rnmapbox/maps'

Mapbox.setAccessToken(AppConfig.mapboxAccessToken)

if (AppConfig.sentryDsn) {
  Sentry.init({
    dsn: AppConfig.sentryDsn,
    environment: AppConfig.environment,
    tracesSampleRate: 0.2,
  })
}

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

    trackEvent('app_opened')

    api.post('/payments/reconcile', {}).catch(() => {
      // Non-fatal — reconciliation runs on best effort
    })
  }, [isAuthenticated])

  React.useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('integrations/xero')) {
        trackEvent('xero_connect_started', { deepLink: true })
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </>
  )
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <AppContent />
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(App)
