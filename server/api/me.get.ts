import { defineEventHandler } from 'h3'
import { requireUserId } from '../auth/require-user-id'

/**
 * Cheap authenticated endpoint the SPA calls once per session to tell
 * whether the signed-in user is allowlisted (200) or not (403, via the
 * `server/middleware/auth.ts` middleware before this handler even runs).
 * Used to route a signed-in-but-not-allowlisted user to `/not-allowed`.
 */
export default defineEventHandler((event) => {
  const userId = requireUserId(event)
  return { userId }
})
