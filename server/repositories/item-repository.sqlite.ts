import { and, eq } from 'drizzle-orm'
import type { SqliteDbContext } from '../db/client'
import type { ItemUpdate, NewItem } from '../db/schema/types'
import { DuplicateCanonicalUrlError, type ItemListFilter, type ItemRepository } from './types'
import { isCanonicalUrlUniqueViolation, newItemToRow } from './item-repository.shared'

export function createSqliteItemRepository(ctx: SqliteDbContext): ItemRepository {
  const { db, schema } = ctx
  const { items } = schema

  return {
    async create(userId, input: NewItem) {
      const row = newItemToRow(userId, input, new Date())
      try {
        const [created] = await db.insert(items).values(row).returning()
        if (!created) throw new Error('Insert returned no row')
        return created
      } catch (error) {
        if (isCanonicalUrlUniqueViolation(error)) {
          throw new DuplicateCanonicalUrlError(row.canonicalUrl ?? '')
        }
        throw error
      }
    },

    async findById(userId, id) {
      const [found] = await db
        .select()
        .from(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)))
        .limit(1)
      return found ?? null
    },

    async findByCanonicalUrl(userId, canonicalUrl) {
      const [found] = await db
        .select()
        .from(items)
        .where(and(eq(items.canonicalUrl, canonicalUrl), eq(items.userId, userId)))
        .limit(1)
      return found ?? null
    },

    async list(userId, filter?: ItemListFilter) {
      const conditions = [eq(items.userId, userId)]
      if (filter?.type) conditions.push(eq(items.type, filter.type))
      if (filter?.status) conditions.push(eq(items.status, filter.status))
      if (filter?.isFavorite !== undefined) conditions.push(eq(items.isFavorite, filter.isFavorite))

      return db
        .select()
        .from(items)
        .where(and(...conditions))
    },

    async update(userId, id, input: ItemUpdate) {
      try {
        const [updated] = await db
          .update(items)
          .set({ ...input, updatedAt: input.updatedAt ?? new Date() })
          .where(and(eq(items.id, id), eq(items.userId, userId)))
          .returning()
        return updated ?? null
      } catch (error) {
        if (isCanonicalUrlUniqueViolation(error)) {
          throw new DuplicateCanonicalUrlError(input.canonicalUrl ?? '')
        }
        throw error
      }
    },

    async delete(userId, id) {
      const deleted = await db
        .delete(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)))
        .returning({ id: items.id })
      return deleted.length > 0
    }
  }
}
