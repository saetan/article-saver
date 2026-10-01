import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { CLERK_PROXY_PATH, isProductionPublishableKey } from '../auth/clerk-proxy'

/**
 * Points the Clerk client at the app's own `/api/__clerk` proxy when (and
 * only when) the runtime publishable key is the production one. Decided at
 * startup from the managed key, so no proxy URL is configured by hand and
 * development/preview keep talking to their Clerk dev instance directly.
 * An explicit `NUXT_PUBLIC_CLERK_PROXY_URL` is left untouched.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const clerk = ((config.public as Record<string, unknown>).clerk ??= {}) as {
    publishableKey?: string
    proxyUrl?: string
  }
  clerk.publishableKey ||= process.env.CLERK_PUBLISHABLE_KEY
  if (!clerk.proxyUrl && isProductionPublishableKey(clerk.publishableKey)) {
    clerk.proxyUrl = CLERK_PROXY_PATH
  }
})
