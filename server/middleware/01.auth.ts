import { clerkClient } from '@clerk/nuxt/server'
import { createError, defineEventHandler } from 'h3'
import { parseAllowlist } from '../auth/allowlist'
import { authorizeRequest } from '../auth/authorize'
import { normalizeApiPath } from '../auth/normalize-path'
import { resolvePrimaryVerifiedEmail } from '../auth/user-email'
import { useUserEmailCache } from '../auth/user-email-cache'

const PUBLIC_API_PATHS = new Set(['/api/health'])

/**
 * Authorises every `/api/**` request (ADR 0002, 0005), except the public
 * `/api/health` check. Must run after `server/middleware/00.clerk.ts`,
 * which populates `event.context.auth` — the `00.`/`01.` filename prefixes
 * are load-bearing: Nitro loads `server/middleware/*` alphabetically, and
 * `clerk.skipServerMiddleware: true` in `nuxt.config.ts` stops the module
 * auto-registering its middleware elsewhere in the chain (it was found
 * running after this file, making every request look unauthenticated —
 * security review round 2, #5). See `server/middleware/order.unit.test.ts`.
 *
 * - No Clerk session -> 401.
 * - Signed in, but the primary email isn't verified or isn't in
 *   `ALLOWED_EMAILS` (parsed fresh per request so a config change takes
 *   effect without a restart) -> 403. Fails closed: an empty/missing
 *   `ALLOWED_EMAILS` allows nobody.
 * - Otherwise sets `event.context.userId` for handlers (see
 *   `requireUserId`).
 *
 * The path is matched via `normalizeApiPath` (percent-decoded, slashes
 * collapsed, `.`/`..` resolved, lower-cased) rather than the raw
 * `event.path`, so this check is never looser than what Nitro's router
 * actually dispatches to — a naive `startsWith('/api/')` on the raw path
 * can be bypassed with e.g. `/%61pi/me` (security review round 1, #5). A
 * path that fails to decode is rejected outright (400) rather than
 * silently skipped.
 */
export default defineEventHandler(async (event) => {
  const normalized = normalizeApiPath(event.path)

  if (!normalized.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const path = normalized.path

  if (!path.startsWith('/api/') || PUBLIC_API_PATHS.has(path)) {
    return
  }

  const userId = event.context.auth?.()?.userId ?? null

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized (auth middleware)' })
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
      statusMessage:
        result.status === 401 ? 'Unauthorized (auth middleware)' : 'Forbidden (auth middleware)'
    })
  }

  event.context.userId = result.userId
})
