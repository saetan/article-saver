import { describe, expect, it } from 'vitest'
import type { TagRepository } from './types'

export interface TagRepositoryContractContext {
  repo: TagRepository
}

/**
 * A dialect-agnostic contract for `TagRepository`, following the same
 * pattern as the `ItemRepository` contract.
 */
export function runTagRepositoryContractTests(setup: () => Promise<TagRepositoryContractContext>) {
  describe('TagRepository contract', () => {
    it('creates a tag', async () => {
      const { repo } = await setup()

      const tag = await repo.create('user-1', { name: 'reading' })

      expect(tag.id).toBeTruthy()
      expect(tag.userId).toBe('user-1')
      expect(tag.name).toBe('reading')
      expect(tag.createdAt).toBeInstanceOf(Date)
    })

    it('finds a tag by id scoped to the user', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', { name: 'reading' })

      const found = await repo.findById('user-1', created.id)

      expect(found?.id).toBe(created.id)
    })

    it('lists tags for a user', async () => {
      const { repo } = await setup()
      await repo.create('user-1', { name: 'reading' })
      await repo.create('user-1', { name: 'watching' })

      const tags = await repo.list('user-1')

      expect(tags).toHaveLength(2)
    })

    it('deletes a tag', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', { name: 'reading' })

      const deleted = await repo.delete('user-1', created.id)
      const found = await repo.findById('user-1', created.id)

      expect(deleted).toBe(true)
      expect(found).toBeNull()
    })

    it("does not see another user's tags", async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', { name: 'reading' })

      const foundByOther = await repo.findById('user-2', created.id)
      const listedByOther = await repo.list('user-2')

      expect(foundByOther).toBeNull()
      expect(listedByOther).toHaveLength(0)
    })

    it("does not let one user delete another user's tag", async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', { name: 'reading' })

      const deleted = await repo.delete('user-2', created.id)
      const stillThere = await repo.findById('user-1', created.id)

      expect(deleted).toBe(false)
      expect(stillThere).not.toBeNull()
    })
  })
}
