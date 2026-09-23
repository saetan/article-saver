import { sqliteTable, text, integer, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'
import { EXTRACTION_STATUSES, ITEM_STATUSES, ITEM_TYPES, JOB_STATUSES } from './types'
import type { ItemMetadata } from './types'

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type', { enum: ITEM_TYPES }).notNull(),
    url: text('url').notNull(),
    canonicalUrl: text('canonical_url'),
    title: text('title'),
    excerpt: text('excerpt'),
    contentHtml: text('content_html'),
    contentText: text('content_text'),
    pastedText: text('pasted_text'),
    author: text('author'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    siteName: text('site_name'),
    imageUrl: text('image_url'),
    status: text('status', { enum: ITEM_STATUSES }).notNull().default('unread'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    wordCount: integer('word_count'),
    extractionStatus: text('extraction_status', { enum: EXTRACTION_STATUSES })
      .notNull()
      .default('pending'),
    extractionError: text('extraction_error'),
    metadata: text('metadata', { mode: 'json' }).$type<ItemMetadata>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [uniqueIndex('items_user_id_canonical_url_idx').on(table.userId, table.canonicalUrl)]
)

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [uniqueIndex('tags_user_id_name_idx').on(table.userId, table.name)]
)

export const itemTags = sqliteTable(
  'item_tags',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })]
)

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status', { enum: JOB_STATUSES }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  runAt: integer('run_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
})

export const sqliteSchema = { items, tags, itemTags, jobs }
