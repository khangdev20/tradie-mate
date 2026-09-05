// src/hooks/useSyncOnReconnect.ts
// Automatically triggers offline queue sync when network comes back online.
import { useEffect, useRef } from 'react'
import { useNetworkState } from './useNetworkState'
import { useOfflineQueueStore } from './useOfflineQueue'

export function useSyncOnReconnect() {
  const { isConnected } = useNetworkState()
  const { queue, syncQueue } = useOfflineQueueStore()
  const prevConnected = useRef<boolean | null>(null)

  useEffect(() => {
    // Only trigger sync when transitioning from offline → online
    if (prevConnected.current === false && isConnected && queue.length > 0) {
      console.log(`[SyncOnReconnect] Network restored, syncing ${queue.length} queued items...`)
      syncQueue()
        .then(result => {
          if (result.success) {
            console.log(`[SyncOnReconnect] Synced ${result.syncedCount} items successfully`)
          }
        })
        .catch(err => console.warn('[SyncOnReconnect] Sync failed:', err))
    }
    prevConnected.current = isConnected
  }, [isConnected, queue.length, syncQueue])
}
