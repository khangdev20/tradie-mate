import {
  pgTable, uuid, text, boolean, timestamp,
  varchar, pgEnum, index, unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'

export const teamRoleEnum = pgEnum('team_role', ['OWNER', 'ADMIN', 'MEMBER'])
export const inviteStatusEnum = pgEnum('invite_status', ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'])

// A group account — one tradie is owner
export const tradieGroups = pgTable('tradie_groups', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ownerId:         uuid('owner_id').notNull().references(() => tradies.id),
  name:            text('name').notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  maxMembers:      text('max_members').default('5').notNull(),
  isActive:        boolean('is_active').default(true).notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('groups_owner_idx').on(table.ownerId),
])

// Members of a group
export const tradieGroupMembers = pgTable('tradie_group_members', {
  id:      uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid('group_id').notNull().references(() => tradieGroups.id, { onDelete: 'cascade' }),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  role:    teamRoleEnum('role').default('MEMBER').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  unique('group_member_unique').on(table.groupId, table.tradieId),
  index('group_members_group_idx').on(table.groupId),
  index('group_members_tradie_idx').on(table.tradieId),
])

// Pending invitations
export const groupInvitations = pgTable('group_invitations', {
  id:      uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid('group_id').notNull().references(() => tradieGroups.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => tradies.id),
  phone:   varchar('phone', { length: 20 }),
  email:   varchar('email', { length: 255 }),
  status:  inviteStatusEnum('status').default('PENDING').notNull(),
  token:   varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('invites_group_idx').on(table.groupId),
  index('invites_token_idx').on(table.token),
])
