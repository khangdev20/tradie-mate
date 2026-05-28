import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../../store/auth.store'
import { TokenStorage } from '../../services/tokenStorage'
import { BiometricService } from '../../services/biometrics'
import { supabase } from '../../services/supabase'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'

const RootStack = createNativeStackNavigator()

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#2E6B45" />
  </View>
)

export function RootNavigator() {
  const { isAuthenticated, tradieId, refreshSession, logout } = useAuthStore()
  const [isReady, setIsReady] = useState(false)
  const [biometricLocked, setBiometricLocked] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Check if token exists + not expired
        if (isAuthenticated && TokenStorage.isExpired()) {
          await refreshSession()
        }

        // 2. Biometric lock if enabled
        if (isAuthenticated && TokenStorage.hasBiometricEnabled()) {
          setBiometricLocked(true)
          const unlocked = await BiometricService.unlock()
          if (!unlocked) {
            await logout()
          }
          setBiometricLocked(false)
        }
      } catch (error) {
        console.error('Bootstrap error:', error)
      } finally {
        setIsReady(true)
      }
    }

    bootstrap()
  }, [])

  // Supabase session listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          TokenStorage.clearSession()
          useAuthStore.setState({ isAuthenticated: false, session: null })
        }
        if (event === 'TOKEN_REFRESHED' && session) {
          TokenStorage.saveSession({
            access_token:  session.access_token,
            refresh_token: session.refresh_token,
            expires_at:    session.expires_at!,
            tradie_id:     TokenStorage.getTradieId()!,
          })
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (!isReady || biometricLocked) return <LoadingScreen />

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && tradieId ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
