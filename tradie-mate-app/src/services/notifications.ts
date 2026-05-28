// src/services/notifications.ts
// import notifee, { AndroidImportance, EventType } from '@notifee/react-native'
// import messaging from '@react-native-firebase/messaging'

export async function setupNotificationChannels() {
  /*
  await notifee.createChannel({
    id: 'jobs', name: 'New Jobs',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  })
  */
}

export function setupFCMHandlers() {
  /*
  messaging().onMessage(async remoteMessage => {
    console.log('FCM Message received:', remoteMessage)
  })
  */
}
