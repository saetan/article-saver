import { createError, type H3Event } from 'h3'

declare module 'h3' {
  interface H3EventContext {
    /**
     * The authenticated, allowlisted Clerk user id. Set by the
     * `server/middleware/auth.ts` middleware once a request has passed
     * `authorizeRequest`. Repositories are always called with this id
     * (ADR 0002), never a client-supplied one.
     */
    userId?: string
  }
}

/**
 * Typed helper for API handlers: returns the authenticated user id, or
 * throws a 401 if it's missing. Handlers should always go through this
 * (rather than reading `event.context.userId` directly) so a missing id —
 * e.g. a route the auth middleware doesn't cover — fails loudly instead of
 * silently leaking data across users.
 */
export function requireUserId(event: H3Event): string {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return userId
}
