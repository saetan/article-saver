import { clerkMiddleware } from '@clerk/nuxt/server'
import { defineEventHandler } from 'h3'
import { isClerkProxyPath } from '../auth/clerk-proxy'

const clerk = clerkMiddleware()

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
 *
 * `/api/__clerk/**` is skipped: those requests are the Clerk Frontend API
 * proxy (`server/routes/api/__clerk/[...path].ts`), which just forwards them
 * to Clerk, and authenticating them here could trigger handshake
 * redirects on what must be a transparent pass-through.
 */
export default defineEventHandler((event) => {
  if (isClerkProxyPath(event.path)) return
  return clerk(event as Parameters<typeof clerk>[0])
})
