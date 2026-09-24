import { clerkMiddleware } from '@clerk/nuxt/server'

/**
 * Registers Clerk's own middleware explicitly (nuxt.config.ts sets
 * `clerk.skipServerMiddleware: true`) so it runs before
 * `server/middleware/01.auth.ts` — Nitro loads `server/middleware/*`
 * alphabetically, and `00.` sorts before `01.`.
 *
 * This populates `event.context.auth` for every request. Without it,
 * `01.auth.ts` would see `event.context.auth` as undefined and treat
 * every request as unauthenticated (security review round 2, #5: the
 * module's auto-registered middleware ran AFTER ours, so this was a real
 * production bug, not just a test gap).
 */
export default clerkMiddleware()
