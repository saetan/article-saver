import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  primaryKey,
  pgEnum
} from 'drizzle-orm/pg-core'
import { EXTRACTION_STATUSES, ITEM_STATUSES, ITEM_TYPES, JOB_STATUSES } from './types'
import type { ItemMetadata } from './types'

export const itemTypeEnum = pgEnum('item_type', ITEM_TYPES)
export const itemStatusEnum = pgEnum('item_status', ITEM_STATUSES)
export const extractionStatusEnum = pgEnum('extraction_status', EXTRACTION_STATUSES)
export const jobStatusEnum = pgEnum('job_status', JOB_STATUSES)

export const items = pgTable(
  'items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: itemTypeEnum('type').notNull(),
    url: text('url').notNull(),
    canonicalUrl: text('canonical_url'),
    title: text('title'),
    excerpt: text('excerpt'),
    contentHtml: text('content_html'),
    contentText: text('content_text'),
    pastedText: text('pasted_text'),
    author: text('author'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    siteName: text('site_name'),
    imageUrl: text('image_url'),
    status: itemStatusEnum('status').notNull().default('unread'),
    isFavorite: boolean('is_favorite').notNull().default(false),
    notes: text('notes'),
    wordCount: integer('word_count'),
    extractionStatus: extractionStatusEnum('extraction_status').notNull().default('pending'),
    extractionError: text('extraction_error'),
    metadata: jsonb('metadata').$type<ItemMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  },
  (table) => [uniqueIndex('items_user_id_canonical_url_idx').on(table.userId, table.canonicalUrl)]
)

export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (table) => [uniqueIndex('tags_user_id_name_idx').on(table.userId, table.name)]
)

export const itemTags = pgTable(
  'item_tags',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })]
)

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: jobStatusEnum('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  runAt: timestamp('run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
})

export const postgresSchema = { items, tags, itemTags, jobs }
