import { eq, inArray } from 'drizzle-orm'
import { db } from '../config/db'
import { fcm } from '../config/firebase'
import { fcmTokens, notifications } from '../db/schema/notifications'
import { tradies } from '../db/schema/tradies'

export type NotificationType =
  | 'JOB_ASSIGNED'
  | 'JOB_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'NEW_REVIEW'
  | 'DOC_EXPIRING'
  | 'DOC_EXPIRED'
  | 'OFFLINE_SYNC_COMPLETE'
  | 'CALL_JOB_CREATED'

export interface TradieNotification {
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string | number | boolean | null | undefined>
}

// FCM error codes meaning the token will never work again and should be dropped.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

/** FCM data payloads only accept string values. */
export function toFcmData(data: TradieNotification['data'] = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) out[key] = String(value)
  }
  return out
}

export class NotificationService {
  /**
   * Store an in-app notification for the tradie and push it to every
   * registered device. Never throws: a failed push must not fail the
   * business action (payment, document check, call intake) that caused it.
   */
  static async notifyTradie(tradieId: string, notification: TradieNotification): Promise<{ sent: number }> {
    try {
      const data = toFcmData(notification.data)

      const [record] = await db
        .insert(notifications)
        .values({
          tradieId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data,
        })
        .returning()

      const tokens = await this.getDeviceTokens(tradieId)
      if (tokens.length === 0) return { sent: 0 }

      const response = await fcm.sendEachForMulticast({
        tokens,
        notification: { title: notification.title, body: notification.body },
        data: { ...data, type: notification.type, notificationId: record.id },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      })

      const deadTokens = response.responses
        .map((res, i) => (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? '') ? tokens[i] : null))
        .filter((token): token is string => token !== null)
      if (deadTokens.length > 0) {
        await db.delete(fcmTokens).where(inArray(fcmTokens.token, deadTokens))
      }

      const firstMessageId = response.responses.find((res) => res.success)?.messageId
      if (firstMessageId) {
        await db
          .update(notifications)
          .set({ fcmMessageId: firstMessageId, sentAt: new Date() })
          .where(eq(notifications.id, record.id))
      }

      return { sent: response.successCount }
    } catch (err) {
      console.warn(`[Notifications] Failed to notify tradie ${tradieId} (${notification.type}):`, err)
      return { sent: 0 }
    }
  }

  private static async getDeviceTokens(tradieId: string): Promise<string[]> {
    const rows = await db
      .select({ token: fcmTokens.token })
      .from(fcmTokens)
      .where(eq(fcmTokens.tradieId, tradieId))

    const [tradie] = await db
      .select({ fcmToken: tradies.fcmToken })
      .from(tradies)
      .where(eq(tradies.id, tradieId))
      .limit(1)

    const tokens = new Set(rows.map((row) => row.token))
    if (tradie?.fcmToken) tokens.add(tradie.fcmToken)
    return [...tokens]
  }
}
