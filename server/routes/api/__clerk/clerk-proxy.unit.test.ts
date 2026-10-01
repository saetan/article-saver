import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import handler from './[...path]'

const proxy = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<Response>>())
const config = vi.hoisted(() => ({
  value: {
    clerk: { secretKey: 'sk_live_x' },
    public: { clerk: { publishableKey: 'pk_live_x' } }
  } as Record<string, unknown>
}))
vi.mock('@clerk/backend/proxy', () => ({ clerkFrontendApiProxy: proxy }))
vi.mock('#imports', () => ({ useRuntimeConfig: () => config.value }))

function fakeEvent(req: Request, path?: string): H3Event {
  const url = new URL(req.url)
  return {
    path: path ?? url.pathname + url.search,
    __req: req,
    node: { req: { headers: Object.fromEntries(req.headers), url: url.pathname } }
  } as unknown as H3Event
}
vi.mock('h3', async (orig) => ({
  ...(await orig<typeof import('h3')>()),
  toWebRequest: (event: { __req: Request }) => event.__req,
  getRequestURL: (event: { __req: Request }) => new URL(event.__req.url)
}))

describe('/api/__clerk proxy route', () => {
  const originalOrigin = process.env.NUXT_PUBLIC_APP_ORIGIN

  beforeEach(() => {
    proxy.mockReset()
    delete process.env.NUXT_PUBLIC_APP_ORIGIN
    config.value = {
      clerk: { secretKey: 'sk_live_x' },
      public: { clerk: { publishableKey: 'pk_live_x' } }
    }
  })
  afterEach(() => {
    if (originalOrigin === undefined) delete process.env.NUXT_PUBLIC_APP_ORIGIN
    else process.env.NUXT_PUBLIC_APP_ORIGIN = originalOrigin
  })

  it('forwards method, body, query, cookies and returns the proxy Response untouched', async () => {
    const response = new Response('{"ok":true}', { status: 200 })
    proxy.mockResolvedValue(response)
    const req = new Request('https://app.example.com/api/__clerk/v1/client?x=1', {
      method: 'POST',
      body: 'hello',
      headers: { cookie: '__client=abc', 'content-type': 'text/plain' }
    })

    const result = await handler(fakeEvent(req))

    expect(result).toBe(response)
    const [passed, options] = proxy.mock.calls[0] as [Request, Record<string, unknown>]
    expect(passed.url).toBe('https://app.example.com/api/__clerk/v1/client?x=1')
    expect(passed.method).toBe('POST')
    expect(await passed.text()).toBe('hello')
    expect(passed.headers.get('cookie')).toBe('__client=abc')
    expect(options).toEqual({
      proxyPath: '/api/__clerk',
      publishableKey: 'pk_live_x',
      secretKey: 'sk_live_x'
    })
  })

  it('pins the public host/proto headers to NUXT_PUBLIC_APP_ORIGIN', async () => {
    process.env.NUXT_PUBLIC_APP_ORIGIN = 'https://article-saver-yongsongsae.replit.app'
    proxy.mockResolvedValue(new Response('{}'))
    const req = new Request('http://localhost:5000/api/__clerk/v1/environment', {
      headers: { 'x-forwarded-host': 'internal.invalid', 'x-forwarded-proto': 'http' }
    })

    await handler(fakeEvent(req))

    const [passed] = proxy.mock.calls[0] as [Request]
    expect(passed.url).toBe(
      'https://article-saver-yongsongsae.replit.app/api/__clerk/v1/environment'
    )
    expect(passed.headers.get('x-forwarded-host')).toBe('article-saver-yongsongsae.replit.app')
    expect(passed.headers.get('x-forwarded-proto')).toBe('https')
  })

  it('does not exist for a development publishable key', async () => {
    config.value = {
      clerk: { secretKey: 'sk_test_x' },
      public: { clerk: { publishableKey: 'pk_test_x' } }
    }
    const req = new Request('https://app.example.com/api/__clerk/v1/environment')
    await expect(handler(fakeEvent(req))).rejects.toMatchObject({ statusCode: 404 })
    expect(proxy).not.toHaveBeenCalled()
  })

  it.each([
    '/api/__clerk/../items',
    '/api/__clerk/%2e%2e/items',
    '/api/__clerk//v1',
    '/api/__clerk/%E0%A4%A'
  ])('rejects traversal/malformed path %s', async (path) => {
    const req = new Request('https://app.example.com/api/__clerk/v1/environment')
    await expect(handler(fakeEvent(req, path))).rejects.toMatchObject({ statusCode: 400 })
    expect(proxy).not.toHaveBeenCalled()
  })
})
