import React from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootNavigator } from './navigation/RootNavigator'
import { setupSessionRefresh } from '../services/sessionRefresh'
import { useSyncOnReconnect } from '../hooks/useSyncOnReconnect'

const queryClient = new QueryClient()

import Mapbox from '@rnmapbox/maps'
import { AppConfig } from '../constants/config'

Mapbox.setAccessToken(AppConfig.mapboxAccessToken)

function AppInner() {
  useSyncOnReconnect()
  return <RootNavigator />
}

export default function App() {
  React.useEffect(() => {
    const cleanup = setupSessionRefresh()
    return () => cleanup()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" />
          <AppInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
