import { describe, expect, it } from 'vitest'
import { isClerkProxyPath, isProductionPublishableKey } from './clerk-proxy'

describe('isClerkProxyPath', () => {
  it.each([
    '/api/__clerk',
    '/api/__clerk/v1/environment',
    '/api/__clerk/v1/client?a=b',
    '//api//__clerk/v1'
  ])('accepts %s', (path) => expect(isClerkProxyPath(path)).toBe(true))

  it.each([
    '/__clerk/v1/environment',
    '/api/__clerkx',
    '/api/items',
    '/api/__clerk/../items',
    '/api/__clerk/%2E%2E/items',
    '/api/__clerk%2F..%2Fitems',
    '/api/__clerk/%E0%A4%A'
  ])('rejects %s', (path) => expect(isClerkProxyPath(path)).toBe(false))
})

describe('isProductionPublishableKey', () => {
  it('is true only for pk_live_ keys', () => {
    expect(isProductionPublishableKey('pk_live_abc')).toBe(true)
    expect(isProductionPublishableKey('pk_test_abc')).toBe(false)
    expect(isProductionPublishableKey(undefined)).toBe(false)
    expect(isProductionPublishableKey('')).toBe(false)
  })
})
