import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import handler from './[...path]'

const proxy = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<Response>>())
vi.mock('@clerk/backend/proxy', () => ({ clerkFrontendApiProxy: proxy }))
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    clerk: { secretKey: 'sk_test_x' },
    public: { clerk: { publishableKey: 'pk_test_x' } }
  })
}))
vi.mock('h3', async (orig) => ({
  ...(await orig<typeof import('h3')>()),
  toWebRequest: (event: { __req: Request }) => event.__req
}))

describe('/__clerk proxy route', () => {
  beforeEach(() => proxy.mockReset())

  it('forwards the web request to clerkFrontendApiProxy and returns its Response', async () => {
    const response = new Response('{"ok":true}', { status: 200 })
    proxy.mockResolvedValue(response)
    const req = new Request('https://app.example.com/__clerk/v1/client?x=1', {
      method: 'POST',
      body: 'hello'
    })

    const result = await handler({ __req: req } as unknown as H3Event)

    expect(result).toBe(response)
    expect(proxy).toHaveBeenCalledTimes(1)
    const [passed, options] = proxy.mock.calls[0] as [Request, unknown]
    expect(passed).toBe(req)
    expect(passed.url).toBe('https://app.example.com/__clerk/v1/client?x=1')
    expect(passed.method).toBe('POST')
    expect(await passed.text()).toBe('hello')
    expect(options).toEqual({
      proxyPath: '/__clerk',
      publishableKey: 'pk_test_x',
      secretKey: 'sk_test_x'
    })
  })
})
