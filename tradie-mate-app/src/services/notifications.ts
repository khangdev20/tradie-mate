// src/services/notifications.ts
import notifee, { AndroidImportance } from '@notifee/react-native'
import messaging from '@react-native-firebase/messaging'
import api from './apiService'

export async function setupNotificationChannels() {
  await notifee.createChannel({
    id: 'jobs',
    name: 'Jobs',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  })

  await notifee.createChannel({
    id: 'payments',
    name: 'Payments',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  })
}

export function setupFCMHandlers() {
  try {
    return messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'TradieMate'
      const body = remoteMessage.notification?.body ?? 'You have a new update.'
      const channelId = remoteMessage.data?.category === 'payments' ? 'payments' : 'jobs'

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          pressAction: { id: 'default' },
          actions: [
            { title: 'View Details', pressAction: { id: 'view-details' } },
          ],
        },
      })
    })
  } catch (error) {
    console.warn('Firebase Messaging setup skipped (Firebase not initialized natively):', error)
    return () => {}
  }
}

export async function registerDeviceForPushNotifications() {
  try {
    const settings = await notifee.requestPermission()
    if (settings.authorizationStatus < 1) {
      return { registered: false, reason: 'permission_denied' as const }
    }

    await messaging().registerDeviceForRemoteMessages()
    const token = await messaging().getToken()
    await api.post('/devices/fcm-token', { token })

    return { registered: true as const }
  } catch (error) {
    console.warn('Push notification registration failed (Firebase not initialized natively):', error)
    return { registered: false, reason: 'permission_denied' as const }
  }
}
