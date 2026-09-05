import admin from 'firebase-admin'
import type { Messaging } from 'firebase-admin/messaging'
import { env } from './env'

if (!admin.apps.length) {
  if (env.NODE_ENV === 'test') {
    admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID })
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }
}

export const firestore = admin.firestore()
export const fcm: Messaging = admin.messaging()
export const firebaseAdmin = admin
