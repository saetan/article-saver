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
  })
}
