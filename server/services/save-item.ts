import type { Item } from '../db/schema/types'
import { detectItemType } from '../items/item-type'
import { EXTRACT_JOB_TYPE } from '../jobs/process-job'
import type { ItemRepository, JobRepository } from '../repositories/types'
import { DuplicateCanonicalUrlError } from '../repositories/types'
import { InvalidCanonicalUrlError } from '../url/errors'
import { assertNotDuplicate, DuplicateItemError, findDuplicate } from './duplicate-detection'

export { DuplicateItemError, InvalidCanonicalUrlError }

/**
 * Saves a URL for `userId`: canonicalise, reject duplicates, detect the Item
 * type, create the Item with `extraction_status=pending` and enqueue an
 * `extract` job (ADR 0008).
 *
 * @throws {InvalidCanonicalUrlError} unparseable / non-http(s) URL
 * @throws {DuplicateItemError} the user already saved this canonical URL,
 *   including when a concurrent save wins the race for the unique index.
 */
export async function saveItemByUrl(
  deps: { items: ItemRepository; jobs: JobRepository },
  userId: string,
  url: string
): Promise<Item> {
  const canonicalUrl = await assertNotDuplicate(deps.items, userId, url)

  let item: Item
  try {
    item = await deps.items.create(userId, {
      type: detectItemType(canonicalUrl),
      url,
      canonicalUrl,
      extractionStatus: 'pending'
    })
  } catch (error) {
    if (error instanceof DuplicateCanonicalUrlError) {
      const existing = await findDuplicate(deps.items, userId, url)
      if (existing) throw new DuplicateItemError(existing.id, existing.createdAt)
    }
    throw error
  }

  try {
    await deps.jobs.create(userId, { itemId: item.id, type: EXTRACT_JOB_TYPE })
  } catch (error) {
    // Never leave an Item "pending" with no job to ever resolve it.
    await deps.items.update(userId, item.id, {
      extractionStatus: 'failed',
      extractionError: 'Could not queue extraction'
    })
    throw error
  }

  return item
}
