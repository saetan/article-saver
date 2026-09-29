import { describe, expect, it } from 'vitest'
import type { JobRepository } from './types'

export interface JobRepositoryContractContext {
  repo: JobRepository
  /** An id of an existing item (in the same user's data) to attach jobs to. */
  itemId: string
}

/**
 * A dialect-agnostic contract for `JobRepository`, following the same
 * pattern as the `ItemRepository` contract.
 */
export function runJobRepositoryContractTests(setup: () => Promise<JobRepositoryContractContext>) {
  describe('JobRepository contract', () => {
    it('creates a job with pending status and zero attempts by default', async () => {
      const { repo, itemId } = await setup()

      const job = await repo.create('user-1', { itemId, type: 'extract' })

      expect(job.id).toBeTruthy()
      expect(job.status).toBe('pending')
      expect(job.attempts).toBe(0)
      expect(job.createdAt).toBeInstanceOf(Date)
    })

    it('finds a job by id scoped to the user', async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })

      const found = await repo.findById('user-1', created.id)

      expect(found?.id).toBe(created.id)
    })

    it('lists pending jobs for a user', async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })
      const succeeded = await repo.create('user-1', { itemId, type: 'extract' })
      await repo.update('user-1', succeeded.id, { status: 'succeeded' })

      const pending = await repo.listPending('user-1')

      expect(pending.map((j) => j.id)).toEqual([created.id])
    })

    it('updates a job', async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })

      const updated = await repo.update('user-1', created.id, {
        status: 'failed',
        attempts: 1,
        error: 'boom'
      })

      expect(updated?.status).toBe('failed')
      expect(updated?.attempts).toBe(1)
      expect(updated?.error).toBe('boom')
    })

    it('deletes a job', async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })

      const deleted = await repo.delete('user-1', created.id)
      const found = await repo.findById('user-1', created.id)

      expect(deleted).toBe(true)
      expect(found).toBeNull()
    })

    it("does not see another user's jobs", async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })

      const foundByOther = await repo.findById('user-2', created.id)
      const listedByOther = await repo.listPending('user-2')

      expect(foundByOther).toBeNull()
      expect(listedByOther).toHaveLength(0)
    })

    it("does not let one user update another user's job", async () => {
      const { repo, itemId } = await setup()
      const created = await repo.create('user-1', { itemId, type: 'extract' })

      const updated = await repo.update('user-2', created.id, { status: 'failed' })
      const stillPending = await repo.findById('user-1', created.id)

      expect(updated).toBeNull()
      expect(stillPending?.status).toBe('pending')
    })

    describe('claimNext', () => {
      const now = new Date('2026-01-01T12:00:00Z')

      it('claims a runnable job: running, attempts incremented', async () => {
        const { repo, itemId } = await setup()
        const created = await repo.create('user-1', { itemId, type: 'extract' })

        const claimed = await repo.claimNext(now)

        expect(claimed?.id).toBe(created.id)
        expect(claimed?.status).toBe('running')
        expect(claimed?.attempts).toBe(1)
        expect(claimed?.userId).toBe('user-1')
      })

      it('returns null when nothing is runnable, and does not re-claim a running job', async () => {
        const { repo, itemId } = await setup()
        expect(await repo.claimNext(now)).toBeNull()
        await repo.create('user-1', { itemId, type: 'extract' })
        expect(await repo.claimNext(now)).not.toBeNull()
        expect(await repo.claimNext(now)).toBeNull()
      })

      it('honours run_at: a future job is not claimed until it is due', async () => {
        const { repo, itemId } = await setup()
        const later = new Date(now.getTime() + 60_000)
        const created = await repo.create('user-1', { itemId, type: 'extract', runAt: later })

        expect(await repo.claimNext(now)).toBeNull()
        expect((await repo.claimNext(later))?.id).toBe(created.id)
      })

      it('claims jobs across users, oldest first', async () => {
        const { repo, itemId } = await setup()
        const first = await repo.create('user-1', { itemId, type: 'extract' })
        await new Promise((resolve) => setTimeout(resolve, 5))
        const second = await repo.create('user-2', { itemId, type: 'extract' })

        expect((await repo.claimNext(now))?.id).toBe(first.id)
        expect((await repo.claimNext(now))?.id).toBe(second.id)
      })

      it('never hands the same job to two concurrent claimers', async () => {
        const { repo, itemId } = await setup()
        const created = await Promise.all(
          Array.from({ length: 8 }, () => repo.create('user-1', { itemId, type: 'extract' }))
        )

        // 20 concurrent claimers race for 8 jobs.
        const results = await Promise.all(Array.from({ length: 20 }, () => repo.claimNext(now)))
        const claimedIds = results.filter((j) => j !== null).map((j) => j.id)

        expect(claimedIds).toHaveLength(created.length)
        expect(new Set(claimedIds).size).toBe(created.length)
      })

      it('takes over a running job only after its lease expires, and only once under concurrency', async () => {
        const { repo, itemId } = await setup()
        const created = await repo.create('user-1', { itemId, type: 'extract' })
        await repo.claimNext(now, 60_000)

        expect(await repo.claimNext(new Date(now.getTime() + 59_000), 60_000)).toBeNull()

        const later = new Date(now.getTime() + 61_000)
        const results = await Promise.all(
          Array.from({ length: 10 }, () => repo.claimNext(later, 60_000))
        )
        const claimed = results.filter((j) => j !== null)
        expect(claimed).toHaveLength(1)
        expect(claimed[0]).toMatchObject({ id: created.id, attempts: 2, status: 'running' })
      })
    })
  })
}
