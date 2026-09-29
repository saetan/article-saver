import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import type { PostgresDbContext } from '../db/client'
import { generateId } from '../db/id'
import type { JobRepository } from './types'

export function createPostgresJobRepository(ctx: PostgresDbContext): JobRepository {
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

    async claimNext(now) {
      // Postgres: the inner SELECT locks its candidate row with FOR UPDATE SKIP LOCKED, so
      // concurrent workers each lock a different pending row (or none); the outer
      // `status = 'pending'` re-check guards the READ COMMITTED re-evaluation.
      const candidate = db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.status, 'pending'), or(isNull(jobs.runAt), lte(jobs.runAt, now))))
        .orderBy(asc(jobs.createdAt), asc(jobs.id))
        .limit(1)
        .for('update', { skipLocked: true })
      const [claimed] = await db
        .update(jobs)
        .set({ status: 'running', attempts: sql`${jobs.attempts} + 1`, updatedAt: now })
        .where(and(eq(jobs.status, 'pending'), inArray(jobs.id, candidate)))
        .returning()
      return claimed ?? null
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
