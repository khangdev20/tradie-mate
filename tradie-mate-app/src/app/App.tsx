import React from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootNavigator } from './navigation/RootNavigator'
import { setupSessionRefresh } from '../services/sessionRefresh'
import { useAutoSync } from '../hooks/useAutoSync'

const queryClient = new QueryClient()

import Mapbox from '@rnmapbox/maps'
import { AppConfig } from '../constants/config'

Mapbox.setAccessToken(AppConfig.mapboxAccessToken)

function AppContent() {
  useAutoSync()

  React.useEffect(() => {
    const cleanup = setupSessionRefresh()
    return () => cleanup()
  }, [])

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
