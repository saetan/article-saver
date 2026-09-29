import { defineEventHandler } from 'h3'
import { requireUserId } from '../auth/require-user-id'
import { ITEM_LIST_LIMIT, toItemSummary } from '../items/item-dto'
import { createItemRepository } from '../repositories/item-repository'

/** `GET /api/items`: the signed-in user's newest 50 items, no filters (filters come in #18). */
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const items = await createItemRepository()
  const list = await items.list(userId, { limit: ITEM_LIST_LIMIT })
  return list.map(toItemSummary)
})
