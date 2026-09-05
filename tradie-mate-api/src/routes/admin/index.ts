import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { EntitlementService } from '../../services/entitlement.service'
import { db } from '../../config/db'
import { tradieGroups, tradieGroupMembers, groupInvitations } from '../../db/schema/teams'
import { jobs } from '../../db/schema/jobs'
import { tradies } from '../../db/schema/tradies'
import { eq, and, sql } from 'drizzle-orm'
import { AppError } from '../../utils/errors'
import crypto from 'crypto'
import twilio from 'twilio'
import { env } from '../../config/env'

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  // ─── Group Management ──────────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/group
   * Get or create the group for the authenticated tradie (owner only).
   */
  fastify.get('/group', async (request) => {
    const tradieId = request.tradie.id

    const [group] = await db
      .select()
      .from(tradieGroups)
      .where(eq(tradieGroups.ownerId, tradieId))
      .limit(1)

    if (!group) {
      return { success: true, data: { group: null } }
    }

    const members = await db
      .select({
        id: tradieGroupMembers.id,
        tradieId: tradieGroupMembers.tradieId,
        role: tradieGroupMembers.role,
        joinedAt: tradieGroupMembers.joinedAt,
        firstName: tradies.firstName,
        lastName: tradies.lastName,
        tradeType: tradies.tradeType,
        avatarUrl: tradies.avatarUrl,
      })
      .from(tradieGroupMembers)
      .leftJoin(tradies, eq(tradieGroupMembers.tradieId, tradies.id))
      .where(eq(tradieGroupMembers.groupId, group.id))

    return {
      success: true,
      data: { group, members },
    }
  })

  /**
   * GET /api/v1/admin/members
   * Module 3.3 — List all members in the tradie's group.
   */
  fastify.get('/members', async (request) => {
    const tradieId = request.tradie.id

    // Enforce team members entitlement
    await EntitlementService.requireEntitlement(tradieId, 'teamMembersLimit')

    // Find group by owner or membership
    const [ownerGroup] = await db
      .select()
      .from(tradieGroups)
      .where(eq(tradieGroups.ownerId, tradieId))
      .limit(1)

    const [memberGroup] = ownerGroup
      ? [ownerGroup]
      : await db
          .select({ id: tradieGroups.id, ownerId: tradieGroups.ownerId, name: tradieGroups.name })
          .from(tradieGroupMembers)
          .leftJoin(tradieGroups, eq(tradieGroupMembers.groupId, tradieGroups.id))
          .where(eq(tradieGroupMembers.tradieId, tradieId))
          .limit(1)
          .then((rows) => rows.map((r) => ({ id: (r as any).id, ownerId: (r as any).ownerId, name: (r as any).name })))

    if (!memberGroup?.id) {
      return { success: true, data: { members: [] } }
    }

    const members = await db
      .select({
        memberId: tradieGroupMembers.id,
        tradieId: tradieGroupMembers.tradieId,
        role: tradieGroupMembers.role,
        joinedAt: tradieGroupMembers.joinedAt,
        firstName: tradies.firstName,
        lastName: tradies.lastName,
        phone: tradies.phone,
        tradeType: tradies.tradeType,
        avatarUrl: tradies.avatarUrl,
        isActive: tradies.isActive,
      })
      .from(tradieGroupMembers)
      .leftJoin(tradies, eq(tradieGroupMembers.tradieId, tradies.id))
      .where(eq(tradieGroupMembers.groupId, memberGroup.id))

    return {
      success: true,
      data: { members },
    }
  })

  /**
   * POST /api/v1/admin/members/invite
   * Module 3.3 — Invite a tradie to the group via phone number.
   * Only the group owner or admin can invite.
   */
  fastify.post<{
    Body: { phone?: string; email?: string }
  }>('/members/invite', async (request, reply) => {
    const tradieId = request.tradie.id
    const { phone, email } = request.body

    if (!phone && !email) {
      throw new AppError('phone or email is required to invite a member.', 400, 'MISSING_CONTACT')
    }

    // Enforce team entitlement
    await EntitlementService.requireEntitlement(tradieId, 'teamMembersLimit')

    // Find or create group for this owner
    let [group] = await db
      .select()
      .from(tradieGroups)
      .where(eq(tradieGroups.ownerId, tradieId))
      .limit(1)

    if (!group) {
      const tradie = request.tradie
      const [newGroup] = await db
        .insert(tradieGroups)
        .values({
          ownerId: tradieId,
          name: `${tradie.firstName}'s Team`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      group = newGroup

      // Add owner as OWNER member
      await db.insert(tradieGroupMembers).values({
        groupId: group.id,
        tradieId,
        role: 'OWNER',
        joinedAt: new Date(),
      }).onConflictDoNothing()
    }

    // Check member limit
    const { entitlements } = await EntitlementService.getEffectiveEntitlements(tradieId)
    const limit = entitlements.teamMembersLimit

    const [currentCount] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(tradieGroupMembers)
      .where(eq(tradieGroupMembers.groupId, group.id))

    if (Number(currentCount?.c ?? 0) >= limit) {
      throw new AppError(
        `Team member limit of ${limit} reached. Upgrade your plan to add more members.`,
        403,
        'TEAM_LIMIT_REACHED'
      )
    }

    // Generate invite token (expires 7 days)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(groupInvitations).values({
      groupId: group.id,
      invitedBy: tradieId,
      phone: phone || null,
      email: email || null,
      status: 'PENDING',
      token,
      expiresAt,
      createdAt: new Date(),
    })

    const inviteUrl = `https://tradiemate.com.au/invite/${token}`

    // Send SMS invite (best-effort)
    if (phone) {
      try {
        const tradie = request.tradie
        await twilioClient.messages.create({
          from: env.TWILIO_FROM_NUMBER,
          to: phone,
          body: `${tradie.firstName} invited you to join their team on TradieMate. Accept here: ${inviteUrl}`,
        })
      } catch (smsErr) {
        fastify.log.warn({ smsErr, phone }, 'Failed to send invite SMS')
      }
    }

    return reply.status(201).send({
      success: true,
      data: {
        inviteToken: token,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      },
    })
  })

  /**
   * POST /api/v1/admin/jobs/assign
   * Module 3.3 — Assign an existing job to a team member.
   */
  fastify.post<{
    Body: { jobId: string; assignToTradieId: string }
  }>('/jobs/assign', async (request) => {
    const tradieId = request.tradie.id
    const { jobId, assignToTradieId } = request.body

    if (!jobId || !assignToTradieId) {
      throw new AppError('jobId and assignToTradieId are required.', 400, 'MISSING_FIELDS')
    }

    // Verify the requesting tradie owns the job
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
      .limit(1)

    if (!job) {
      throw new AppError('Job not found or you do not have permission.', 404, 'JOB_NOT_FOUND')
    }

    // Verify the target tradie is in the same group
    const [ownerGroup] = await db
      .select()
      .from(tradieGroups)
      .where(eq(tradieGroups.ownerId, tradieId))
      .limit(1)

    if (ownerGroup) {
      const [membership] = await db
        .select()
        .from(tradieGroupMembers)
        .where(
          and(
            eq(tradieGroupMembers.groupId, ownerGroup.id),
            eq(tradieGroupMembers.tradieId, assignToTradieId)
          )
        )
        .limit(1)

      if (!membership) {
        throw new AppError('Target tradie is not a member of your team.', 403, 'NOT_TEAM_MEMBER')
      }
    }

    // Reassign the job
    const [updated] = await db
      .update(jobs)
      .set({
        tradieId: assignToTradieId,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning()

    return {
      success: true,
      data: {
        jobId: updated.id,
        assignedToTradieId: assignToTradieId,
        updatedAt: updated.updatedAt,
      },
    }
  })

  /**
   * POST /api/v1/admin/group/accept-invite
   * Accept a group invitation using a token.
   */
  fastify.post<{
    Body: { token: string }
  }>('/group/accept-invite', async (request) => {
    const tradieId = request.tradie.id
    const { token } = request.body

    if (!token) {
      throw new AppError('Invite token is required.', 400, 'MISSING_TOKEN')
    }

    const now = new Date()
    const [invite] = await db
      .select()
      .from(groupInvitations)
      .where(and(eq(groupInvitations.token, token), eq(groupInvitations.status, 'PENDING')))
      .limit(1)

    if (!invite) {
      throw new AppError('Invite not found or already used.', 404, 'INVITE_NOT_FOUND')
    }

    if (new Date(invite.expiresAt) < now) {
      await db.update(groupInvitations).set({ status: 'EXPIRED' }).where(eq(groupInvitations.id, invite.id))
      throw new AppError('This invite has expired.', 410, 'INVITE_EXPIRED')
    }

    // Add to group
    await db
      .insert(tradieGroupMembers)
      .values({
        groupId: invite.groupId,
        tradieId,
        role: 'MEMBER',
        joinedAt: now,
      })
      .onConflictDoNothing()

    await db
      .update(groupInvitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(groupInvitations.id, invite.id))

    return {
      success: true,
      data: { message: 'You have joined the team.' },
    }
  })
}
