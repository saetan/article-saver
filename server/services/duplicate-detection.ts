import type { Item } from '../db/schema/types'
import type { ItemRepository } from '../repositories/types'
import { canonicalizeUrl } from '../url/canonicalize'

/**
 * Thrown when a URL a user is about to save already matches an existing
 * Item's canonical URL for that user (ADR 0013, `CONTEXT.md`: Duplicate).
 * The `POST /api/items` route (#12) catches this and responds `409
 * Conflict`, and the UI shows "Already saved on <date> — Open it".
 */
export class DuplicateItemError extends Error {
  readonly existingItemId: string
  readonly savedAt: Date

  constructor(existingItemId: string, savedAt: Date) {
    super(`Item already saved (id: ${existingItemId}, saved at ${savedAt.toISOString()}).`)
    this.name = 'DuplicateItemError'
    this.existingItemId = existingItemId
    this.savedAt = savedAt
  }
}

/**
 * Canonicalises `url` and looks up whether the user already has an Item
 * with that canonical URL. Returns `null` when there is no duplicate.
 */
export async function findDuplicate(
  repo: ItemRepository,
  userId: string,
  url: string
): Promise<Item | null> {
  const canonicalUrl = canonicalizeUrl(url)
  return repo.findByCanonicalUrl(userId, canonicalUrl)
}

/**
 * Canonicalises `url` and throws {@link DuplicateItemError} if the user
 * already has an Item with that canonical URL. Otherwise returns the
 * canonical URL, ready to pass to `ItemRepository.create`.
 *
 * This is a pre-flight check, not a lock: the unique `(user_id,
 * canonical_url)` index is still the source of truth. A concurrent save
 * between this check and the following `create` will surface as
 * `DuplicateCanonicalUrlError` from `create` itself, not from here — callers
 * (e.g. #12's save endpoint) must catch that too and translate it the same
 * way, e.g. by re-running {@link findDuplicate}.
 */
export async function assertNotDuplicate(
  repo: ItemRepository,
  userId: string,
  url: string
): Promise<string> {
  const canonicalUrl = canonicalizeUrl(url)
  const existing = await repo.findByCanonicalUrl(userId, canonicalUrl)
  if (existing) throw new DuplicateItemError(existing.id, existing.createdAt)
  return canonicalUrl
}
