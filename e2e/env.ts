import { existsSync } from 'node:fs'

/** Port the built app is served on during e2e. */
export const APP_PORT = 3100
/** Port the stub HTTP server (fake external sites) listens on. */
export const STUB_PORT = 4010

export const APP_URL = `http://localhost:${APP_PORT}`
export const STUB_URL = `http://localhost:${STUB_PORT}`

/**
 * Loads `.env` into `process.env` (without overriding anything already set,
 * so CI secrets win) and maps the Nuxt-prefixed Clerk names to the names
 * `@clerk/testing` expects. Returns the e2e user's email.
 */
export function loadE2eEnv(): { email: string } {
  if (existsSync('.env')) process.loadEnvFile('.env')

  const publishableKey = process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const secretKey = process.env.NUXT_CLERK_SECRET_KEY
  if (!publishableKey || !secretKey) {
    throw new Error(
      'E2E needs NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY and NUXT_CLERK_SECRET_KEY (Clerk development instance).'
    )
  }
  process.env.CLERK_PUBLISHABLE_KEY = publishableKey
  process.env.CLERK_SECRET_KEY = secretKey

  const email =
    process.env.E2E_CLERK_USER_EMAIL?.trim() ||
    process.env.ALLOWED_EMAILS?.split(',')[0]?.trim() ||
    ''
  if (!email) {
    throw new Error('E2E needs E2E_CLERK_USER_EMAIL (or a non-empty ALLOWED_EMAILS in .env).')
  }
  process.env.E2E_CLERK_USER_EMAIL = email
  return { email }
}
