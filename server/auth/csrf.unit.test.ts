import { describe, expect, it } from 'vitest'
import { isBearerTokenRequest, isSameOriginRequest, requiresCsrfCheck } from './csrf'

const own = 'https://app.example.com'

describe('requiresCsrfCheck', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('%s is state-changing', (method) => {
    expect(requiresCsrfCheck(method)).toBe(true)
  })
  it.each(['GET', 'HEAD', 'OPTIONS'])('%s is not', (method) => {
    expect(requiresCsrfCheck(method)).toBe(false)
  })
})

describe('isSameOriginRequest', () => {
  const base = { method: 'POST', origin: undefined, secFetchSite: undefined, requestOrigin: own }

  it('allows a matching Origin', () => {
    expect(isSameOriginRequest({ ...base, origin: own })).toBe(true)
  })
  it('refuses a different Origin, scheme, host or port', () => {
    for (const origin of [
      'https://evil.example',
      'http://app.example.com',
      'https://app.example.com:8443',
      'https://app.example.com.evil.example',
      'null'
    ]) {
      expect(isSameOriginRequest({ ...base, origin })).toBe(false)
    }
  })
  it('Origin wins over Sec-Fetch-Site', () => {
    expect(
      isSameOriginRequest({ ...base, origin: 'https://evil.example', secFetchSite: 'same-origin' })
    ).toBe(false)
  })
  it('without Origin, requires Sec-Fetch-Site: same-origin', () => {
    expect(isSameOriginRequest({ ...base, secFetchSite: 'same-origin' })).toBe(true)
    for (const site of ['cross-site', 'same-site', 'none']) {
      expect(isSameOriginRequest({ ...base, secFetchSite: site })).toBe(false)
    }
  })
  it('refuses when neither header is present', () => {
    expect(isSameOriginRequest(base)).toBe(false)
  })
})

describe('isBearerTokenRequest (M2 extension point)', () => {
  it('is not implemented yet: never exempts a request', () => {
    expect(isBearerTokenRequest('Bearer abc')).toBe(false)
    expect(isBearerTokenRequest(undefined)).toBe(false)
  })
})
