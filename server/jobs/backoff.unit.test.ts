import { describe, expect, it } from 'vitest'
import { backoffDelayMs, MAX_BACKOFF_MS, MAX_JOB_ATTEMPTS } from './backoff'

describe('backoffDelayMs', () => {
  it('doubles per attempt from the base', () => {
    expect(backoffDelayMs(1, 1000)).toBe(1000)
    expect(backoffDelayMs(2, 1000)).toBe(2000)
    expect(backoffDelayMs(3, 1000)).toBe(4000)
  })

  it('has 30s and 60s defaults for the two retries before the final attempt', () => {
    expect(backoffDelayMs(1)).toBe(30_000)
    expect(backoffDelayMs(2)).toBe(60_000)
  })

  it('caps at the maximum', () => {
    expect(backoffDelayMs(30)).toBe(MAX_BACKOFF_MS)
    expect(backoffDelayMs(5, 1000, 3000)).toBe(3000)
  })

  it('rejects non-positive or fractional attempts', () => {
    expect(() => backoffDelayMs(0)).toThrow(RangeError)
    expect(() => backoffDelayMs(1.5)).toThrow(RangeError)
  })

  it('allows 3 attempts', () => {
    expect(MAX_JOB_ATTEMPTS).toBe(3)
  })
})
