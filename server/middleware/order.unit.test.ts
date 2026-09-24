import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIDDLEWARE_DIR = join(import.meta.dirname, '.')
const NUXT_CONFIG_PATH = join(import.meta.dirname, '..', '..', 'nuxt.config.ts')

/**
 * Regression test for security review round 2 (#5): `@clerk/nuxt`'s
 * auto-registered `clerkMiddleware()` was found running AFTER
 * `01.auth.ts` in the built server, so `event.context.auth` was always
 * undefined and every authenticated request 401'd. The unit tests for
 * `01.auth.ts` mock `event.context.auth` directly, so they can't catch a
 * regression in *registration order* — only an assertion on the actual
 * setup (config + filenames) can.
 *
 * This locks in the two things that together guarantee the order:
 * 1. `nuxt.config.ts` sets `clerk.skipServerMiddleware: true`, so the
 *    module doesn't also register its own middleware elsewhere in the
 *    chain.
 * 2. `server/middleware/00.clerk.ts` (which calls `clerkMiddleware()`)
 *    sorts alphabetically before `server/middleware/01.auth.ts` — Nitro
 *    loads `server/middleware/*` in that order.
 */
describe('server middleware registration order (security review round 2, #5)', () => {
  it('nuxt.config.ts disables the auto-registered Clerk middleware', () => {
    const source = readFileSync(NUXT_CONFIG_PATH, 'utf-8')
    expect(source).toMatch(/skipServerMiddleware\s*:\s*true/)
  })

  it('00.clerk.ts sorts before 01.auth.ts in server/middleware/', () => {
    const files = readdirSync(MIDDLEWARE_DIR)
      .filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.unit.test.ts'))
      .sort()

    expect(files).toContain('00.clerk.ts')
    expect(files).toContain('01.auth.ts')
    expect(files.indexOf('00.clerk.ts')).toBeLessThan(files.indexOf('01.auth.ts'))
  })

  it('00.clerk.ts actually registers clerkMiddleware()', () => {
    const source = readFileSync(join(MIDDLEWARE_DIR, '00.clerk.ts'), 'utf-8')
    expect(source).toMatch(/clerkMiddleware\s*\(/)
  })
})
