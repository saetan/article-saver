import type { Item } from '../db/schema/types'
import { EXTRACT_JOB_TYPE } from '../jobs/process-job'
import type { ItemRepository, JobRepository } from '../repositories/types'

/** The item exists but is not in the `failed` extraction state, so retrying makes no sense. */
export class ItemNotFailedError extends Error {
  constructor() {
    super('Only failed items can be retried.')
    this.name = 'ItemNotFailedError'
  }
}

/**
 * Re-queues extraction for a failed item: resets it to `pending`, clears the
 * error and enqueues a fresh `extract` job. Returns `null` when the item does
 * not exist for this user (another user's item looks the same).
 *
 * @throws {ItemNotFailedError} the item's extraction has not failed
 */
export async function retryExtraction(
  deps: { items: ItemRepository; jobs: JobRepository },
  userId: string,
  id: string
): Promise<Item | null> {
  const item = await deps.items.findById(userId, id)
  if (!item) return null
  if (item.extractionStatus !== 'failed') throw new ItemNotFailedError()

  const reset = await deps.items.update(userId, id, {
    extractionStatus: 'pending',
    extractionError: null
  })
  if (!reset) return null
  try {
    await deps.jobs.create(userId, { itemId: id, type: EXTRACT_JOB_TYPE })
  } catch (error) {
    // Never leave an Item "pending" with no job to ever resolve it.
    await deps.items.update(userId, id, {
      extractionStatus: 'failed',
      extractionError: 'Could not queue extraction'
    })
    throw error
  }
  return reset
}
