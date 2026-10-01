import { clerkFrontendApiProxy } from '@clerk/backend/proxy'
import { defineEventHandler, toWebRequest } from 'h3'
import { useRuntimeConfig } from '#imports'

/**
 * Proxies Clerk's Frontend API through the app at `/__clerk`.
 *
 * Replit manages our Clerk instance, and its production publishable key
 * points at a Frontend API host (`clerk.<app>.replit.app`) that has no TLS
 * certificate, so the browser can't load Clerk UI from it. Replit-managed
 * Clerk expects published apps to proxy the Frontend API instead. Enabled
 * by setting `NUXT_PUBLIC_CLERK_PROXY_URL` (production only: Clerk
 * proxies only work for production instances, never development ones).
 *
 * `server/middleware/00.clerk.ts` skips `/__clerk/**`; `01.auth.ts` only
 * gates `/api/**`.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clerk = (config.clerk ?? {}) as { secretKey?: string }
  const publicClerk = (config.public?.clerk ?? {}) as { publishableKey?: string }

  return clerkFrontendApiProxy(toWebRequest(event), {
    proxyPath: '/__clerk',
    publishableKey: publicClerk.publishableKey || process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: clerk.secretKey || process.env.CLERK_SECRET_KEY
  })
})
