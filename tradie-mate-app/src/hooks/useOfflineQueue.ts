import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'
import api from '../services/apiService'

const storage = new MMKV({
  id: 'offline-sync-queue',
  encryptionKey: 'tradiemate-offline-key-secure' // Encrypted MMKV key usage
})

// Custom storage wrapper for Zustand
const zustandStorage = {
  setItem: (name: string, value: string) => {
    storage.set(name, value)
  },
  getItem: (name: string) => {
    const value = storage.getString(name)
    return value ?? null
  },
  removeItem: (name: string) => {
    storage.delete(name)
  },
}

export interface QueueItem {
  id: string
  idempotencyKey: string
  action: 'UPDATE_STATUS' | 'CREATE_INVOICE' | 'CREATE_JOB' | 'PAY_INVOICE'
  payload: any
  timestamp: string
}

interface OfflineQueueState {
  queue: QueueItem[]
  addToQueue: (action: QueueItem['action'], payload: any) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
  syncQueue: () => Promise<{ success: boolean; syncedCount: number }>
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],

      addToQueue: (action, payload) => {
        const newItem: QueueItem = {
          id: Math.random().toString(36).substring(2, 15),
          idempotencyKey: `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          action,
          payload,
          timestamp: new Date().toISOString(),
        }
        set((state) => ({ queue: [...state.queue, newItem] }))
      },

      removeFromQueue: (id) => {
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }))
      },

      clearQueue: () => {
        set({ queue: [] })
      },

      syncQueue: async () => {
        const { queue, removeFromQueue } = get()
        if (queue.length === 0) {
          return { success: true, syncedCount: 0 }
        }

        try {
          const response = (await api.post('/sync', {
            queue: queue.map((item) => ({
              action: item.action,
              payload: item.payload,
              idempotencyKey: item.idempotencyKey,
            })),
          })) as any

          if (response?.success) {
            const results = response.data?.results ?? []
            let syncedCount = 0

            queue.forEach((item, index) => {
              const result = results[index]
              if (result?.status === 'SUCCESS' || result?.status === 'SKIPPED') {
                removeFromQueue(item.id)
                syncedCount++
              }
            })

            return { success: true, syncedCount }
          }
          return { success: false, syncedCount: 0 }
        } catch (error) {
          console.error('Offline queue sync failed:', error)
          return { success: false, syncedCount: 0 }
        }
      },
    }),
    {
      name: 'offline-queue-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

export function useOfflineQueue() {
  const store = useOfflineQueueStore()
  return store
}
