import { generateId } from '../db/id'
import type { Item, NewItem } from '../db/schema/types'

/** Row shape common to both dialects' `items` table (camelCase, dialect-native values). */
export type ItemRow = Item

export function newItemToRow(userId: string, input: NewItem, now: Date): ItemRow {
  return {
    id: generateId(),
    userId,
    type: input.type,
    url: input.url,
    canonicalUrl: input.canonicalUrl ?? null,
    title: input.title ?? null,
    excerpt: input.excerpt ?? null,
    contentHtml: input.contentHtml ?? null,
    contentText: input.contentText ?? null,
    pastedText: input.pastedText ?? null,
    author: input.author ?? null,
    publishedAt: input.publishedAt ?? null,
    siteName: input.siteName ?? null,
    imageUrl: input.imageUrl ?? null,
    status: input.status ?? 'unread',
    isFavorite: input.isFavorite ?? false,
    notes: input.notes ?? null,
    wordCount: input.wordCount ?? null,
    extractionStatus: input.extractionStatus ?? 'pending',
    extractionError: input.extractionError ?? null,
    metadata: input.metadata ?? null,
    createdAt: now,
    updatedAt: now
  }
}

/** True when the driver-level error looks like our `(user_id, canonical_url)` unique violation. */
export function isCanonicalUrlUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    const message = current instanceof Error ? current.message : String(current)
    if (message.includes('items_user_id_canonical_url_idx')) return true
    // SQLite/libsql reports the violating columns rather than the index name.
    if (message.includes('UNIQUE constraint failed') && message.includes('canonical_url'))
      return true
    if (!(current instanceof Error) || !current.cause) break
  }
  return false
}
