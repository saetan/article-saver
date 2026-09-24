import { describe, expect, it } from 'vitest'
import type { ItemRepository } from '../repositories/types'
import { DuplicateItemError, assertNotDuplicate, findDuplicate } from './duplicate-detection'

export interface DuplicateDetectionContractContext {
  repo: ItemRepository
}

/**
 * A dialect-agnostic contract for the duplicate-detection service, run
 * against a real `ItemRepository` (SQLite here; Postgres once #4 lands) so
 * duplicate detection is exercised through the same unique index the
 * repository relies on, not just against a mock.
 */
export function runDuplicateDetectionContractTests(
  setup: () => Promise<DuplicateDetectionContractContext>
) {
  describe('duplicate detection', () => {
    describe('findDuplicate', () => {
      it('returns null when the user has no matching item', async () => {
        const { repo } = await setup()

        const found = await findDuplicate(repo, 'user-1', 'https://example.com/post')

        expect(found).toBeNull()
      })

      it('finds an existing item by its canonicalised url', async () => {
        const { repo } = await setup()
        const created = await repo.create('user-1', {
          type: 'article',
          url: 'https://example.com/post?utm_source=x',
          canonicalUrl: 'https://example.com/post',
          title: 'A post'
        })

        const found = await findDuplicate(
          repo,
          'user-1',
          'https://EXAMPLE.com/post/?utm_source=newsletter'
        )

        expect(found?.id).toBe(created.id)
      })

      it('does not find items belonging to another user', async () => {
        const { repo } = await setup()
        await repo.create('user-1', {
          type: 'article',
          url: 'https://example.com/post',
          canonicalUrl: 'https://example.com/post',
          title: 'A post'
        })

        const found = await findDuplicate(repo, 'user-2', 'https://example.com/post')

        expect(found).toBeNull()
      })

      it('treats twitter.com and x.com links to the same post as the same item', async () => {
        const { repo } = await setup()
        const created = await repo.create('user-1', {
          type: 'x_post',
          url: 'https://twitter.com/user/status/1',
          canonicalUrl: 'https://x.com/user/status/1',
          title: 'A tweet'
        })

        const found = await findDuplicate(repo, 'user-1', 'https://x.com/user/status/1?s=20')

        expect(found?.id).toBe(created.id)
      })
    })

    describe('assertNotDuplicate', () => {
      it('returns the canonical url when there is no duplicate', async () => {
        const { repo } = await setup()

        const canonicalUrl = await assertNotDuplicate(repo, 'user-1', 'https://example.com/new')

        expect(canonicalUrl).toBe('https://example.com/new')
      })

      it('throws DuplicateItemError with the existing item id and saved date', async () => {
        const { repo } = await setup()
        const created = await repo.create('user-1', {
          type: 'article',
          url: 'https://example.com/post',
          canonicalUrl: 'https://example.com/post',
          title: 'A post'
        })

        const error = await assertNotDuplicate(repo, 'user-1', 'https://example.com/post/').catch(
          (caught: unknown) => caught
        )

        expect(error).toBeInstanceOf(DuplicateItemError)
        expect((error as DuplicateItemError).existingItemId).toBe(created.id)
        expect((error as DuplicateItemError).savedAt).toEqual(created.createdAt)
      })

      it('allows the same canonical url for a different user', async () => {
        const { repo } = await setup()
        await repo.create('user-1', {
          type: 'article',
          url: 'https://example.com/post',
          canonicalUrl: 'https://example.com/post',
          title: 'A post'
        })

        const canonicalUrl = await assertNotDuplicate(repo, 'user-2', 'https://example.com/post')

        expect(canonicalUrl).toBe('https://example.com/post')
      })
    })
  })
}
