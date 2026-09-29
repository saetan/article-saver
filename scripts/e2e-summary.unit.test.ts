import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { buildSummary } from './e2e-summary.mjs'

const fixture = JSON.parse(
  readFileSync(new URL('./__fixtures__/e2e-results.json', import.meta.url), 'utf8')
)

describe('e2e-summary', () => {
  const md: string = buildSummary(fixture, { artifactName: 'playwright-report-1-1' })

  it('renders one row per test with status and duration', () => {
    expect(md).toContain('| GET /api/health returns 200 | PASS | 0.1s |')
    expect(md).toContain('| library > shows empty state | FAIL | 2.5s |')
    expect(md).toContain('| library > todo | SKIP | 0.0s |')
  })

  it('sums retries, marks flaky, and escapes pipes', () => {
    expect(md).toContain('| flaky \\| piped | FLAKY | 1.5s |')
  })

  it('includes totals and the artifact pointer', () => {
    expect(md).toContain('**Total:** 4 tests, 1 passed, 1 failed, 1 flaky, 1 skipped in 4.1s')
    expect(md).toContain('**playwright-report-1-1** artifact')
  })

  it('handles an empty report', () => {
    expect(buildSummary({ suites: [] })).toContain('No tests were reported.')
  })
})
