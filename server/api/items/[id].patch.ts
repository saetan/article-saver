import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireUserId } from '../../auth/require-user-id'
import { parseUpdateItemBody } from '../../items/update-item-body'
import { createItemRepository } from '../../repositories/item-repository'

/**
 * `PATCH /api/items/:id` `{ pastedText }`: store text the user pasted for an
 * item whose extraction failed. Only `pastedText`/`pasted_text` is accepted
 * (strict schema: any other field is a 400); only the parsed text reaches the
 * repository, and `userId` comes from the session. 404 for another user's item.
 */
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const id = getRouterParam(event, 'id')

  const parsed = parseUpdateItemBody(await readBody(event).catch(() => undefined))
  if (!parsed.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: parsed.message })
  }

  const items = await createItemRepository()
  const item = id ? await items.update(userId, id, { pastedText: parsed.pastedText }) : null
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return item
})
