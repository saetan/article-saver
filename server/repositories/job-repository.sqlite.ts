import { and, eq } from 'drizzle-orm'
import type { SqliteDbContext } from '../db/client'
import { generateId } from '../db/id'
import type { JobRepository } from './types'

export function createSqliteJobRepository(ctx: SqliteDbContext): JobRepository {
  const { db, schema } = ctx
  const { jobs } = schema

  return {
    async create(userId, input) {
      const now = new Date()
      const [created] = await db
        .insert(jobs)
        .values({
          id: generateId(),
          userId,
          itemId: input.itemId,
          type: input.type,
          status: input.status ?? 'pending',
          attempts: input.attempts ?? 0,
          error: input.error ?? null,
          runAt: input.runAt ?? null,
          createdAt: now,
          updatedAt: now
        })
        .returning()
      if (!created) throw new Error('Insert returned no row')
      return created
    },

    async findById(userId, id) {
      const [found] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
        .limit(1)
      return found ?? null
    },

    async listPending(userId) {
      return db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.status, 'pending')))
    },

    async update(userId, id, input) {
      const [updated] = await db
        .update(jobs)
        .set({ ...input, updatedAt: input.updatedAt ?? new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
        .returning()
      return updated ?? null
    },

    async delete(userId, id) {
      const deleted = await db
        .delete(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
        .returning({ id: jobs.id })
      return deleted.length > 0
    }
  }
}
