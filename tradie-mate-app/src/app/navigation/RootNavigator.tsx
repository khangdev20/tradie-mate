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
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF8' }}>
    <ActivityIndicator size="large" color="#2E6B45" />
  </View>
)

export function RootNavigator() {
  const { isAuthenticated, tradieId, isOnboarded, fetchOnboardingStatus, refreshSession, logout } = useAuthStore()
  const [isReady, setIsReady] = useState(false)
  const [biometricLocked, setBiometricLocked] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Check if token exists + not expired
        if (isAuthenticated) {
          if (TokenStorage.isExpired()) {
            await refreshSession()
          }
          // Sync onboarding status from backend after any token refresh
          await fetchOnboardingStatus()
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
  }, [isAuthenticated, fetchOnboardingStatus, logout, refreshSession])

  // Supabase session listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          TokenStorage.clearSession()
          useAuthStore.setState({ 
            isAuthenticated: false, 
            session: null,
            isOnboarded: false,
            tradieId: null,
            onboardingStatus: null,
            resumeStep: null
          })
        }
        if (event === 'TOKEN_REFRESHED' && session) {
          TokenStorage.saveSession({
            access_token:  session.access_token,
            refresh_token: session.refresh_token,
            expires_at:    session.expires_at!,
            tradie_id:     TokenStorage.getTradieId()!,
          })
          await fetchOnboardingStatus()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [fetchOnboardingStatus])

  if (!isReady || biometricLocked) return <LoadingScreen />

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && tradieId && isOnboarded ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
