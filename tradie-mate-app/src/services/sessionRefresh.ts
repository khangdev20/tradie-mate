import { AppState, AppStateStatus } from 'react-native'
import { TokenStorage } from './tokenStorage'
import { useAuthStore } from '../store/auth.store'

export function setupSessionRefresh() {
  // Refresh when app comes to foreground
  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'active' && TokenStorage.isExpired()) {
      await useAuthStore.getState().refreshSession()
    }
  }

  const subscription = AppState.addEventListener('change', handleAppStateChange)

  // Periodic refresh every 10 minutes
  const interval = setInterval(async () => {
    if (TokenStorage.isExpired()) {
      await useAuthStore.getState().refreshSession()
    }
  }, 10 * 60 * 1000)

  // Cleanup
  return () => {
    subscription.remove()
    clearInterval(interval)
  }
}
