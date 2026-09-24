import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const API_DIR = join(import.meta.dirname, '.')

/**
 * Handlers explicitly exempt from "every API handler calls
 * `requireUserId`" (ADR 0002: the app is public but private data isn't).
 * Keep this list as small as possible — it's the app's entire public API
 * surface.
 */
const PUBLIC_HANDLERS = new Set(['health.get.ts'])

const HANDLER_FILENAME = /\.(get|post|put|patch|delete|head|options)\.ts$/

function listHandlerFiles(): string[] {
  return readdirSync(API_DIR, { recursive: true })
    .filter((entry): entry is string => typeof entry === 'string')
    .filter((entry) => HANDLER_FILENAME.test(entry))
    .sort()
}

/**
 * Defence in depth for the "unauthenticated -> 401, not allowlisted -> 403"
 * requirement (issue #5, security review round 1): the `server/middleware/
 * auth.ts` middleware is the primary guard for `/api/**`, but this test
 * makes sure no future handler can silently skip the second layer
 * (`requireUserId(event)`) by forgetting to call it — every handler other
 * than the explicit public allowlist must call it.
 */
describe('server/api handlers require auth by default', () => {
  it('every handler other than the public allowlist calls requireUserId', () => {
    const files = listHandlerFiles()
    expect(files.length).toBeGreaterThan(0)

    const missing = files.filter((file) => {
      if (PUBLIC_HANDLERS.has(file)) return false
      const source = readFileSync(join(API_DIR, file), 'utf-8')
      return !source.includes('requireUserId(')
    })

    expect(missing).toEqual([])
  })

  it('the public allowlist only lists handlers that actually exist', () => {
    const files = new Set(listHandlerFiles())
    for (const publicHandler of PUBLIC_HANDLERS) {
      expect(files.has(publicHandler)).toBe(true)
    }
  })
})
