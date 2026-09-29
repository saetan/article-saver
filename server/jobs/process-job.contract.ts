import { describe, expect, it } from 'vitest'
import type { ItemRepository, JobRepository } from '../repositories/types'
import { EXTRACTION_NOT_AVAILABLE_MESSAGE, type Extractor } from './extractor'
import { processNextJob } from './process-job'

export interface JobPipelineContext {
  items: ItemRepository
  jobs: JobRepository
}

const T0 = new Date('2026-01-01T12:00:00Z')

async function enqueue(
  ctx: JobPipelineContext,
  userId = 'user-1',
  canonicalUrl = 'https://a.test/x'
) {
  const item = await ctx.items.create(userId, {
    type: 'article',
    url: canonicalUrl,
    canonicalUrl,
    extractionStatus: 'pending'
  })
  const job = await ctx.jobs.create(userId, { itemId: item.id, type: 'extract' })
  return { item, job }
}

/**
 * Behaviour of the job-processing function against a real database, run on
 * whichever dialect the caller provides (in-memory SQLite in the unit
 * project; file SQLite / Postgres in the integration project).
 */
export function runJobPipelineTests(setup: () => Promise<JobPipelineContext>) {
  describe('processNextJob', () => {
    it('is idle when there is nothing to do', async () => {
      const ctx = await setup()
      expect(await processNextJob({ ...ctx, extractors: {}, now: () => T0 })).toBe('idle')
    })

    it('runs the extractor for the item type and marks item and job succeeded', async () => {
      const ctx = await setup()
      const { item, job } = await enqueue(ctx)
      const extractor: Extractor = {
        extract: async () => ({ title: 'Hello', contentText: 'body', wordCount: 1 })
      }

      const outcome = await processNextJob({
        ...ctx,
        extractors: { article: extractor },
        now: () => T0
      })

      expect(outcome).toBe('succeeded')
      const saved = await ctx.items.findById('user-1', item.id)
      expect(saved).toMatchObject({
        title: 'Hello',
        contentText: 'body',
        extractionStatus: 'succeeded',
        extractionError: null
      })
      expect((await ctx.jobs.findById('user-1', job.id))?.status).toBe('succeeded')
    })

    it('fails a type with no extractor immediately, without retrying', async () => {
      const ctx = await setup()
      const { item, job } = await enqueue(ctx)

      const outcome = await processNextJob({ ...ctx, extractors: {}, now: () => T0 })

      expect(outcome).toBe('failed')
      const failedItem = await ctx.items.findById('user-1', item.id)
      expect(failedItem?.extractionStatus).toBe('failed')
      expect(failedItem?.extractionError).toBe(EXTRACTION_NOT_AVAILABLE_MESSAGE)
      const failedJob = await ctx.jobs.findById('user-1', job.id)
      expect(failedJob).toMatchObject({ status: 'failed', attempts: 1 })
      expect(await processNextJob({ ...ctx, extractors: {}, now: () => T0 })).toBe('idle')
    })

    it('retries a throwing extractor with exponential backoff, then fails for good after 3 attempts', async () => {
      const ctx = await setup()
      const { item, job } = await enqueue(ctx)
      let calls = 0
      const extractor: Extractor = {
        extract: async () => {
          calls++
          throw new Error(`boom ${calls}`)
        }
      }
      const backoffMs = (attempt: number) => 1000 * 2 ** (attempt - 1)
      const run = (now: Date) =>
        processNextJob({ ...ctx, extractors: { article: extractor }, now: () => now, backoffMs })

      // Attempt 1 fails: rescheduled 1s out, and not runnable before then.
      expect(await run(T0)).toBe('retry_scheduled')
      const afterFirst = await ctx.jobs.findById('user-1', job.id)
      expect(afterFirst).toMatchObject({ status: 'pending', attempts: 1, error: 'boom 1' })
      expect(afterFirst?.runAt?.getTime()).toBe(T0.getTime() + 1000)
      expect(await run(new Date(T0.getTime() + 999))).toBe('idle')
      expect((await ctx.items.findById('user-1', item.id))?.extractionStatus).toBe('pending')

      // Attempt 2 fails: rescheduled 2s out.
      const t1 = new Date(T0.getTime() + 1000)
      expect(await run(t1)).toBe('retry_scheduled')
      expect((await ctx.jobs.findById('user-1', job.id))?.runAt?.getTime()).toBe(
        t1.getTime() + 2000
      )

      // Attempt 3 fails: final.
      const t2 = new Date(t1.getTime() + 2000)
      expect(await run(t2)).toBe('failed')
      expect(calls).toBe(3)
      expect(await ctx.jobs.findById('user-1', job.id)).toMatchObject({
        status: 'failed',
        attempts: 3,
        error: 'boom 3'
      })
      const failedItem = await ctx.items.findById('user-1', item.id)
      expect(failedItem).toMatchObject({ extractionStatus: 'failed', extractionError: 'boom 3' })
      expect(await run(new Date(t2.getTime() + 1_000_000))).toBe('idle')
    })

    it('succeeds on a retry after an earlier failure', async () => {
      const ctx = await setup()
      const { item } = await enqueue(ctx)
      let calls = 0
      const extractor: Extractor = {
        extract: async () => {
          if (++calls === 1) throw new Error('flaky')
          return { title: 'Recovered' }
        }
      }
      const backoffMs = () => 1000
      const run = (now: Date) =>
        processNextJob({ ...ctx, extractors: { article: extractor }, now: () => now, backoffMs })

      expect(await run(T0)).toBe('retry_scheduled')
      expect(await run(new Date(T0.getTime() + 1000))).toBe('succeeded')
      expect(await ctx.items.findById('user-1', item.id)).toMatchObject({
        title: 'Recovered',
        extractionStatus: 'succeeded'
      })
    })

    it("scopes writes to the job's own user", async () => {
      const ctx = await setup()
      const mine = await enqueue(ctx, 'user-1', 'https://a.test/mine')
      const theirs = await enqueue(ctx, 'user-2', 'https://a.test/theirs')

      await processNextJob({ ...ctx, extractors: {}, now: () => T0 })
      await processNextJob({ ...ctx, extractors: {}, now: () => T0 })

      expect((await ctx.items.findById('user-1', mine.item.id))?.extractionStatus).toBe('failed')
      expect((await ctx.items.findById('user-2', theirs.item.id))?.extractionStatus).toBe('failed')
    })

    it('two workers processing concurrently never run the same job twice', async () => {
      const ctx = await setup()
      for (let i = 0; i < 6; i++) await enqueue(ctx, 'user-1', `https://a.test/${i}`)
      const seen: string[] = []
      const extractor: Extractor = {
        extract: async (item) => {
          seen.push(item.id)
          await new Promise((resolve) => setTimeout(resolve, 5))
          return { title: 't' }
        }
      }
      const worker = async () => {
        let n = 0
        while (
          (await processNextJob({ ...ctx, extractors: { article: extractor }, now: () => T0 })) !==
          'idle'
        )
          n++
        return n
      }

      const counts = await Promise.all([worker(), worker()])

      expect(counts[0]! + counts[1]!).toBe(6)
      expect(seen).toHaveLength(6)
      expect(new Set(seen).size).toBe(6)
    })
  })
}
