// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@clerk/nuxt'],

  // SPA mode: everything is behind login and needs no SEO. See ADR 0011.
  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  // ADR 0005: Clerk for browser sessions, restricted/allowlist sign-up.
  //
  // skipServerMiddleware: the module's auto-registered clerkMiddleware()
  // was found (security review round 2, #5) to run AFTER our own
  // server/middleware/01.auth.ts in the built server — Nitro appends
  // module-registered handlers after directory-scanned server/middleware/*
  // ones, not before — so `event.context.auth` was always undefined and
  // every authenticated request 401'd. We register Clerk's middleware
  // ourselves instead, as server/middleware/00.clerk.ts, so Nitro's
  // alphabetical ordering of server/middleware/ puts it before
  // 01.auth.ts. See server/middleware/order.unit.test.ts for the
  // regression test.
  clerk: {
    signInUrl: '/sign-in',
    skipServerMiddleware: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
