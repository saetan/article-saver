import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireUserId } from '../../auth/require-user-id'
import { createItemRepository } from '../../repositories/item-repository'
import { createJobRepository } from '../../repositories/job-repository'
import { ItemNotFailedError, retryExtraction } from '../../services/retry-item'

/**
 * `POST /api/items/:id/retry`: re-enqueue extraction for the signed-in user's
 * failed item. 404 for a missing or another user's item, 409 when the item
 * has not failed. Returns the reset (pending) item.
 */
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')
  try {
    const [items, jobs] = await Promise.all([createItemRepository(), createJobRepository()])
    const item = id ? await retryExtraction({ items, jobs }, userId, id) : null
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    return item
  } catch (error) {
    if (error instanceof ItemNotFailedError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Only failed items can be retried.'
      })
    }
    throw error
  }
})
