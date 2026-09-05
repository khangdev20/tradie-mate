import { useEffect, useRef } from 'react'
import { useNetworkState } from './useNetworkState'
import { useOfflineQueueStore } from './useOfflineQueue'

/**
 * Automatically flushes the offline queue when network connectivity returns.
 */
export function useAutoSync() {
  const { isConnected, status, setStatus } = useNetworkState()
  const syncQueue = useOfflineQueueStore((s) => s.syncQueue)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isConnected) {
      wasOffline.current = true
      return
    }

    if (wasOffline.current && isConnected) {
      wasOffline.current = false
      setStatus('syncing')

      syncQueue()
        .then(({ success, syncedCount }) => {
          if (success && syncedCount > 0) {
            console.log(`Offline sync complete: ${syncedCount} items`)
          }
        })
        .finally(() => {
          setStatus('online')
        })
    }
  }, [isConnected, setStatus, syncQueue])
}
