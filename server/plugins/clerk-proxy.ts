import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'
import { CLERK_PROXY_PATH, isProductionPublishableKey } from '../auth/clerk-proxy'

type RequestHookApp = {
  hooks: {
    hook(name: 'request', handler: (event: H3Event) => void): void
  }
}

/**
 * Forwards Replit's runtime-managed proxy URL to the Clerk client. It is
 * auto-populated in production and empty in development. If it is empty but
 * the key is a pk_live_ key, falls back to the same-origin proxy path so the
 * browser never talks to the Frontend API host directly. Otherwise the proxy
 * is removed. Custom Nuxt proxy overrides (NUXT_PUBLIC_CLERK_PROXY_URL) must
 * never take precedence.
 */
export default defineNitroPlugin((nitroApp: RequestHookApp) => {
  // Nitro freezes global runtime config. Its event-scoped copy is mutable
  // and is also the configuration serialized for the browser.
  nitroApp.hooks.hook('request', (event) => {
    const config = useRuntimeConfig(event)
    const clerk = ((config.public as Record<string, unknown>).clerk ??= {}) as {
      publishableKey?: string
      proxyUrl?: string
    }
    clerk.publishableKey ||= process.env.CLERK_PUBLISHABLE_KEY
    const proxyUrl =
      process.env.CLERK_PROXY_URL ||
      (isProductionPublishableKey(clerk.publishableKey) ? CLERK_PROXY_PATH : undefined)
    if (proxyUrl) {
      clerk.proxyUrl = proxyUrl
    } else {
      delete clerk.proxyUrl
    }
  })
})
