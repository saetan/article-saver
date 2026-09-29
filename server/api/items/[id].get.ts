import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireUserId } from '../../auth/require-user-id'
import { createItemRepository } from '../../repositories/item-repository'

/** `GET /api/items/:id`: one of the signed-in user's items; another user's id is a 404, never a 403. */
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')
  const item = id ? await (await createItemRepository()).findById(userId, id) : null
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  return item
})
