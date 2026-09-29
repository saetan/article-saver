import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireUserId } from '../auth/require-user-id'
import { parseSaveItemBody } from '../items/save-item-body'
import { createItemRepository } from '../repositories/item-repository'
import { createJobRepository } from '../repositories/job-repository'
import { DuplicateItemError, InvalidCanonicalUrlError, saveItemByUrl } from '../services/save-item'

/**
 * `POST /api/items` `{ url }`: save a URL (capture channel: URL paste).
 * - 201 with the new Item (extraction is queued, `extractionStatus: pending`)
 * - 400 on an invalid body or a URL that is not http(s)
 * - 409 `{ existingItemId, savedAt }` when the user already saved it
 *
 * Only the zod-parsed `url` is used; the raw body is never spread anywhere
 * near the repository, and `userId` always comes from the session.
 */
export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)

  const parsed = parseSaveItemBody(await readBody(event).catch(() => undefined))
  if (!parsed.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: parsed.message })
  }

  try {
    const [items, jobs] = await Promise.all([createItemRepository(), createJobRepository()])
    const item = await saveItemByUrl({ items, jobs }, userId, parsed.body.url)
    setResponseStatus(event, 201)
    return item
  } catch (error) {
    if (error instanceof InvalidCanonicalUrlError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Enter a valid http(s) URL.'
      })
    }
    if (error instanceof DuplicateItemError) {
      setResponseStatus(event, 409)
      return { existingItemId: error.existingItemId, savedAt: error.savedAt }
    }
    throw error
  }
})
