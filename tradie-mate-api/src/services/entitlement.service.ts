import { db } from '../config/db'
import {
  tradieSubscriptions,
  planEntitlements,
  entitlementOverrides,
  usageCounters
} from '../db/schema/subscriptions'
import { eq, and, gt, sql, or, isNull } from 'drizzle-orm'
import { AppError } from '../utils/errors'

export interface EntitlementsPayload {
  maxJobsPerMonth: number
  maxInvoicesPerMonth: number
  tapToPayEnabled: boolean
  customerTrackingEnabled: boolean
  reviewRequestsEnabled: boolean
  xeroSyncEnabled: boolean
  teamMembersLimit: number
  callToJobEnabled: boolean
  aiVoiceEnabled: boolean
  [key: string]: any
}

const DEFAULT_ENTITLEMENTS: EntitlementsPayload = {
  maxJobsPerMonth: 10,
  maxInvoicesPerMonth: 5,
  tapToPayEnabled: false,
  customerTrackingEnabled: false,
  reviewRequestsEnabled: false,
  xeroSyncEnabled: false,
  teamMembersLimit: 1,
  callToJobEnabled: false,
  aiVoiceEnabled: false,
}

export class EntitlementService {
  static async getEffectiveEntitlements(tradieId: string): Promise<{
    planCode: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    entitlements: EntitlementsPayload
  }> {
    // 1. Get active subscription
    const [sub] = await db
      .select()
      .from(tradieSubscriptions)
      .where(
        and(
          eq(tradieSubscriptions.tradieId, tradieId),
          sql`${tradieSubscriptions.status} IN ('ACTIVE', 'TRIALING')`
        )
      )
      .limit(1)

    const planCode = sub ? sub.planCode : 'FREE'
    const status = sub ? sub.status : 'CANCELED'

    // Calculate current billing period dates
    const now = new Date()
    const currentPeriodStart = sub?.currentPeriodStart ?? new Date(now.getFullYear(), now.getMonth(), 1)
    const currentPeriodEnd = sub?.currentPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // 2. Fetch base plan entitlements
    let baseEntitlements = { ...DEFAULT_ENTITLEMENTS }
    if (sub) {
      const [planEnt] = await db
        .select()
        .from(planEntitlements)
        .where(eq(planEntitlements.planCode, planCode))
        .limit(1)

      if (planEnt && planEnt.entitlements) {
        baseEntitlements = { ...baseEntitlements, ...(planEnt.entitlements as object) }
      }
    }

    // 3. Fetch active overrides
    const overrides = await db
      .select()
      .from(entitlementOverrides)
      .where(
        and(
          eq(entitlementOverrides.tradieId, tradieId),
          or(
            isNull(entitlementOverrides.expiresAt),
            gt(entitlementOverrides.expiresAt, now)
          )
        )
      )

    // Merge overrides (taking precedence)
    const mergedEntitlements = { ...baseEntitlements }
    for (const ov of overrides) {
      if (ov.entitlements) {
        Object.assign(mergedEntitlements, ov.entitlements)
      }
    }

    return {
      planCode,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      entitlements: mergedEntitlements,
    }
  }

  static async requireEntitlement(tradieId: string, entitlementKey: keyof EntitlementsPayload) {
    const { entitlements } = await this.getEffectiveEntitlements(tradieId)
    const value = entitlements[entitlementKey]

    if (!value) {
      throw new AppError(`This action requires the ${String(entitlementKey)} entitlement.`, 403)
    }
    return value
  }

  static async getUsageCount(
    tradieId: string,
    key: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const [counter] = await db
      .select()
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.tradieId, tradieId),
          eq(usageCounters.key, key),
          eq(usageCounters.periodStart, periodStart),
          eq(usageCounters.periodEnd, periodEnd)
        )
      )
      .limit(1)

    return counter ? counter.count : 0
  }

  static async requireUsageLimit(
    tradieId: string,
    usageKey: string,
    limitKey: keyof EntitlementsPayload
  ) {
    const { entitlements, currentPeriodStart, currentPeriodEnd } = await this.getEffectiveEntitlements(
      tradieId
    )

    const limit = entitlements[limitKey]
    if (typeof limit !== 'number') return // No limit applied

    const currentUsage = await this.getUsageCount(
      tradieId,
      usageKey,
      currentPeriodStart,
      currentPeriodEnd
    )

    if (currentUsage >= limit) {
      throw new AppError(
        `Subscription limit reached: You have used ${currentUsage} of ${limit} allowed for ${usageKey}.`,
        403
      )
    }
  }

  static async incrementUsage(tradieId: string, key: string) {
    const { currentPeriodStart, currentPeriodEnd } = await this.getEffectiveEntitlements(tradieId)

    // Atomic upsert usage counter
    await db
      .insert(usageCounters)
      .values({
        tradieId,
        key,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        count: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [usageCounters.tradieId, usageCounters.key, usageCounters.periodStart, usageCounters.periodEnd],
        set: {
          count: sql`${usageCounters.count} + 1`,
          updatedAt: new Date(),
        },
      })
  }
}
