import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

export type NetworkStatusType = 'online' | 'offline' | 'syncing'

export function useNetworkState() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true)
  const [status, setStatus] = useState<NetworkStatusType>('online')

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && (state.isInternetReachable ?? true)
      setIsConnected(connected)
      setStatus(connected ? 'online' : 'offline')
    })

    return () => unsubscribe()
  }, [])

  return {
    isConnected,
    status,
    setStatus, // Allow manual overrides like showing 'syncing' state
  }
}
