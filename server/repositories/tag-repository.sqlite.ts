import { and, eq } from 'drizzle-orm'
import type { SqliteDbContext } from '../db/client'
import { generateId } from '../db/id'
import type { TagRepository } from './types'

export function createSqliteTagRepository(ctx: SqliteDbContext): TagRepository {
  const { db, schema } = ctx
  const { tags } = schema

  return {
    async create(userId, input) {
      const [created] = await db
        .insert(tags)
        .values({ id: generateId(), userId, name: input.name, createdAt: new Date() })
        .returning()
      if (!created) throw new Error('Insert returned no row')
      return created
    },

    async findById(userId, id) {
      const [found] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, id), eq(tags.userId, userId)))
        .limit(1)
      return found ?? null
    },

    async list(userId) {
      return db.select().from(tags).where(eq(tags.userId, userId))
    },

    async delete(userId, id) {
      const deleted = await db
        .delete(tags)
        .where(and(eq(tags.id, id), eq(tags.userId, userId)))
        .returning({ id: tags.id })
      return deleted.length > 0
    }
  }
}
