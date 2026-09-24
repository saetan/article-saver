import { clerkClient } from '@clerk/nuxt/server'
import { createError, defineEventHandler } from 'h3'
import { parseAllowlist } from '../auth/allowlist'
import { authorizeRequest } from '../auth/authorize'
import { resolvePrimaryVerifiedEmail } from '../auth/user-email'
import { useUserEmailCache } from '../auth/user-email-cache'

const PUBLIC_API_PATHS = new Set(['/api/health'])

/**
 * Authorises every `/api/**` request (ADR 0002, 0005), except the public
 * `/api/health` check. Runs after `@clerk/nuxt`'s own middleware, which
 * populates `event.context.auth`.
 *
 * - No Clerk session -> 401.
 * - Signed in, but the primary email isn't verified or isn't in
 *   `ALLOWED_EMAILS` (parsed fresh per request so a config change takes
 *   effect without a restart) -> 403. Fails closed: an empty/missing
 *   `ALLOWED_EMAILS` allows nobody.
 * - Otherwise sets `event.context.userId` for handlers (see
 *   `requireUserId`).
 */
export default defineEventHandler(async (event) => {
  // `event.path` may carry a query string; strip it for matching.
  const path = event.path.split('?')[0] ?? event.path

  if (!path.startsWith('/api/') || PUBLIC_API_PATHS.has(path)) {
    return
  }

  const userId = event.context.auth?.()?.userId ?? null

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const allowlist = parseAllowlist(process.env.ALLOWED_EMAILS)

  const cache = useUserEmailCache()
  let email = cache.get(userId)
  if (email === undefined) {
    // `event` is cast here because `@clerk/nuxt`'s `clerkClient` types its
    // parameter against its own bundled copy of h3's `H3Event`, distinct
    // from (structurally, not just nominally) the one Nitro gives us —
    // it's the same object at runtime, just two separate type declarations.
    const user = await clerkClient(event as Parameters<typeof clerkClient>[0]).users.getUser(userId)
    email = resolvePrimaryVerifiedEmail(user)
    cache.set(userId, email)
  }

  const result = authorizeRequest({ userId, primaryVerifiedEmail: email, allowlist })

  if (!result.authorized) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.status === 401 ? 'Unauthorized' : 'Forbidden'
    })
  }

  event.context.userId = result.userId
})
