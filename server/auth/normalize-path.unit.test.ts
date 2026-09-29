import { describe, expect, it } from 'vitest'
import { normalizeApiPath } from './normalize-path'

describe('normalizeApiPath', () => {
  it('leaves an already-normal API path unchanged', () => {
    expect(normalizeApiPath('/api/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('leaves a non-API path unchanged', () => {
    expect(normalizeApiPath('/library')).toEqual({ ok: true, path: '/library' })
  })

  it('strips a query string', () => {
    expect(normalizeApiPath('/api/me?foo=bar')).toEqual({ ok: true, path: '/api/me' })
  })

  it('strips a fragment', () => {
    expect(normalizeApiPath('/api/me#section')).toEqual({ ok: true, path: '/api/me' })
  })

  it('percent-decodes a single-encoded segment: /%61pi/me -> /api/me', () => {
    expect(normalizeApiPath('/%61pi/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('percent-decodes within a segment: /api/%6de -> /api/me', () => {
    expect(normalizeApiPath('/api/%6de')).toEqual({ ok: true, path: '/api/me' })
  })

  it('collapses repeated leading slashes: //api/me -> /api/me', () => {
    expect(normalizeApiPath('//api/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('lower-cases the path: /API/me -> /api/me', () => {
    expect(normalizeApiPath('/API/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('resolves a leading dot segment: /./api/me -> /api/me', () => {
    expect(normalizeApiPath('/./api/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('resolves a .. segment: /api/health/../me -> /api/me', () => {
    expect(normalizeApiPath('/api/health/../me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('decodes then resolves ..: /api/health%2F..%2Fme -> /api/me', () => {
    expect(normalizeApiPath('/api/health%2F..%2Fme')).toEqual({ ok: true, path: '/api/me' })
  })

  it('does not conflate a longer path with /api/health: /api/healthz stays /api/healthz', () => {
    expect(normalizeApiPath('/api/healthz')).toEqual({ ok: true, path: '/api/healthz' })
  })

  it('drops a trailing slash: /api/health/ -> /api/health', () => {
    expect(normalizeApiPath('/api/health/')).toEqual({ ok: true, path: '/api/health' })
  })

  it('clamps a .. above the root instead of escaping it', () => {
    expect(normalizeApiPath('/../../api/me')).toEqual({ ok: true, path: '/api/me' })
  })

  it('rejects a malformed percent-encoding instead of passing it through', () => {
    expect(normalizeApiPath('/api/%E0%A4%A')).toEqual({ ok: false })
  })

  it('normalises the bare root', () => {
    expect(normalizeApiPath('/')).toEqual({ ok: true, path: '/' })
  })
})
