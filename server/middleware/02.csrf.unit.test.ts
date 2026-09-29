import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import csrfMiddleware from './02.csrf'

function fakeEvent(opts: {
  method: string
  path: string
  headers?: Record<string, string>
}): H3Event {
  const headers = { host: 'app.example.com', ...opts.headers }
  return {
    method: opts.method,
    path: opts.path,
    headers: new Headers(headers),
    node: { req: { headers, method: opts.method, url: opts.path }, res: {} },
    context: {}
  } as unknown as H3Event
}

describe('csrf middleware', () => {
  it('403s a cross-origin POST to /api/**', async () => {
    const event = fakeEvent({
      method: 'POST',
      path: '/api/items',
      headers: { origin: 'https://evil.example' }
    })
    await expect(csrfMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403s a POST with no Origin and no Sec-Fetch-Site', async () => {
    const event = fakeEvent({ method: 'POST', path: '/api/items' })
    await expect(csrfMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a same-origin POST by Origin', async () => {
    const event = fakeEvent({
      method: 'POST',
      path: '/api/items',
      headers: { origin: 'http://app.example.com' }
    })
    await expect(csrfMiddleware(event)).resolves.toBeUndefined()
  })

  it('allows a POST without Origin when Sec-Fetch-Site is same-origin', async () => {
    const event = fakeEvent({
      method: 'POST',
      path: '/api/items',
      headers: { 'sec-fetch-site': 'same-origin' }
    })
    await expect(csrfMiddleware(event)).resolves.toBeUndefined()
  })

  it('honours X-Forwarded-Host/-Proto behind a proxy', async () => {
    const event = fakeEvent({
      method: 'POST',
      path: '/api/items',
      headers: {
        host: 'internal:3000',
        'x-forwarded-host': 'app.example.com',
        'x-forwarded-proto': 'https',
        origin: 'https://app.example.com'
      }
    })
    await expect(csrfMiddleware(event)).resolves.toBeUndefined()
  })

  it.each(['PUT', 'PATCH', 'DELETE'])('also guards %s', async (method) => {
    const event = fakeEvent({
      method,
      path: '/api/items/1',
      headers: { origin: 'https://evil.example' }
    })
    await expect(csrfMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('does not guard safe methods', async () => {
    const event = fakeEvent({
      method: 'GET',
      path: '/api/items',
      headers: { origin: 'https://evil.example' }
    })
    await expect(csrfMiddleware(event)).resolves.toBeUndefined()
  })

  it('does not guard non-API paths', async () => {
    const event = fakeEvent({ method: 'POST', path: '/library' })
    await expect(csrfMiddleware(event)).resolves.toBeUndefined()
  })

  describe('path normalisation (same bypass attempts as the auth middleware)', () => {
    it.each(['/%61pi/items', '//api/items', '/API/items', '/./api/items', '/api/health/../items'])(
      'still 403s a cross-origin POST to %s',
      async (path) => {
        const event = fakeEvent({
          method: 'POST',
          path,
          headers: { origin: 'https://evil.example' }
        })
        await expect(csrfMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
      }
    )

    it('400s a malformed percent-encoding rather than skipping the check', async () => {
      const event = fakeEvent({ method: 'POST', path: '/api/%E0%A4%A' })
      await expect(csrfMiddleware(event)).rejects.toMatchObject({ statusCode: 400 })
    })
  })
})
