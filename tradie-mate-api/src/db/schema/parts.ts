import {
  pgTable, uuid, text, integer,
  boolean, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradeTypeEnum } from './enums'

export const partsLibraryItems = pgTable('parts_library_items', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradeType:        tradeTypeEnum('trade_type').notNull(),
  name:             text('name').notNull(),
  description:      text('description'),
  defaultPriceCents: integer('default_price_cents'),
  unit:             text('unit').default('item').notNull(),
  isActive:         boolean('is_active').default(true).notNull(),
  sortOrder:        integer('sort_order').default(0).notNull(),
}, (table) => [
  index('parts_trade_active_idx').on(table.tradeType, table.isActive),
])
