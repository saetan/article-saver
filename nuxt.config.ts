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
  clerk: {
    signInUrl: '/sign-in'
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
