import { describe, expect, it } from 'vitest'
import type { NewItem } from '../db/schema/types'
import { DuplicateCanonicalUrlError, type ItemRepository } from './types'

export interface ItemRepositoryContractContext {
  repo: ItemRepository
}

function baseItem(overrides: Partial<NewItem> = {}): NewItem {
  return {
    type: 'article',
    url: 'https://example.com/post',
    canonicalUrl: 'example.com/post',
    title: 'A post',
    ...overrides
  }
}

/**
 * A dialect-agnostic contract for `ItemRepository`. Call this from a test
 * file with a factory that builds a fresh repository (and backing db) for
 * each run, so the same suite can exercise SQLite here and Postgres in the
 * dual-dialect harness (#4).
 */
export function runItemRepositoryContractTests(
  setup: () => Promise<ItemRepositoryContractContext>
) {
  describe('ItemRepository contract', () => {
    it('creates an item and generates an id, timestamps and defaults', async () => {
      const { repo } = await setup()

      const item = await repo.create('user-1', baseItem())

      expect(item.id).toBeTruthy()
      expect(item.userId).toBe('user-1')
      expect(item.status).toBe('unread')
      expect(item.isFavorite).toBe(false)
      expect(item.extractionStatus).toBe('pending')
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(item.updatedAt).toBeInstanceOf(Date)
    })

    it('round-trips the metadata JSON column', async () => {
      const { repo } = await setup()

      const item = await repo.create(
        'user-1',
        baseItem({
          type: 'x_post',
          canonicalUrl: 'x.com/user/status/1',
          metadata: { tweetId: '1', handle: '@user' }
        })
      )

      const found = await repo.findById('user-1', item.id)
      expect(found?.metadata).toEqual({ tweetId: '1', handle: '@user' })
    })

    it('finds an item by id scoped to the user', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const found = await repo.findById('user-1', created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
    })

    it('returns null when the item does not exist', async () => {
      const { repo } = await setup()

      const found = await repo.findById('user-1', 'does-not-exist')

      expect(found).toBeNull()
    })

    it('finds an item by canonical url scoped to the user', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const found = await repo.findByCanonicalUrl('user-1', 'example.com/post')

      expect(found?.id).toBe(created.id)
    })

    it('lists items for a user', async () => {
      const { repo } = await setup()
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/a' }))
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/b' }))

      const items = await repo.list('user-1')

      expect(items).toHaveLength(2)
    })

    it('filters listed items', async () => {
      const { repo } = await setup()
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/a', status: 'unread' }))
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/b', status: 'archived' }))

      const archived = await repo.list('user-1', { status: 'archived' })

      expect(archived).toHaveLength(1)
      expect(archived[0]?.status).toBe('archived')
    })

    it('updates an item', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const updated = await repo.update('user-1', created.id, {
        title: 'Updated title',
        status: 'read'
      })

      expect(updated?.title).toBe('Updated title')
      expect(updated?.status).toBe('read')
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
    })

    it('returns null when updating an item that does not exist', async () => {
      const { repo } = await setup()

      const updated = await repo.update('user-1', 'does-not-exist', { title: 'x' })

      expect(updated).toBeNull()
    })

    it('deletes an item', async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const deleted = await repo.delete('user-1', created.id)
      const found = await repo.findById('user-1', created.id)

      expect(deleted).toBe(true)
      expect(found).toBeNull()
    })

    it('returns false when deleting an item that does not exist', async () => {
      const { repo } = await setup()

      const deleted = await repo.delete('user-1', 'does-not-exist')

      expect(deleted).toBe(false)
    })

    it('rejects a duplicate canonical_url for the same user', async () => {
      const { repo } = await setup()
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/dupe' }))

      await expect(
        repo.create('user-1', baseItem({ canonicalUrl: 'example.com/dupe' }))
      ).rejects.toBeInstanceOf(DuplicateCanonicalUrlError)
    })

    it('allows two different users to save the same canonical_url', async () => {
      const { repo } = await setup()
      await repo.create('user-1', baseItem({ canonicalUrl: 'example.com/shared' }))

      const other = await repo.create('user-2', baseItem({ canonicalUrl: 'example.com/shared' }))

      expect(other.userId).toBe('user-2')
    })

    it('allows multiple null canonical_urls per user (e.g. PDFs)', async () => {
      const { repo } = await setup()
      await repo.create('user-1', baseItem({ type: 'pdf', canonicalUrl: null }))

      await expect(
        repo.create('user-1', baseItem({ type: 'pdf', canonicalUrl: null }))
      ).resolves.toBeTruthy()
    })

    it("does not see another user's items", async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const foundByOther = await repo.findById('user-2', created.id)
      const listedByOther = await repo.list('user-2')

      expect(foundByOther).toBeNull()
      expect(listedByOther).toHaveLength(0)
    })

    it("does not let one user update another user's item", async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const updated = await repo.update('user-2', created.id, { title: 'hijacked' })
      const stillOriginal = await repo.findById('user-1', created.id)

      expect(updated).toBeNull()
      expect(stillOriginal?.title).toBe('A post')
    })

    it("does not let one user delete another user's item", async () => {
      const { repo } = await setup()
      const created = await repo.create('user-1', baseItem())

      const deleted = await repo.delete('user-2', created.id)
      const stillThere = await repo.findById('user-1', created.id)

      expect(deleted).toBe(false)
      expect(stillThere).not.toBeNull()
    })
  })
}
