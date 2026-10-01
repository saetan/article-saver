import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'

type RequestHookApp = {
  hooks: {
    hook(name: 'request', handler: (event: H3Event) => void): void
  }
}

/**
 * Forwards Replit's runtime-managed proxy URL to the Clerk client. It is
 * auto-populated in production and empty in development. Custom Nuxt proxy
 * overrides must not take precedence over this managed configuration.
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
    const proxyUrl = process.env.CLERK_PROXY_URL
    if (proxyUrl) {
      clerk.proxyUrl = proxyUrl
    } else {
      delete clerk.proxyUrl
    }
  })
})
