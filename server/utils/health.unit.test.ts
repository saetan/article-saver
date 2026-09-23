import { describe, expect, it } from 'vitest'
import { getHealthStatus } from './health'

describe('getHealthStatus', () => {
  it('reports ok: true', () => {
    expect(getHealthStatus()).toEqual({ ok: true })
  })
})
