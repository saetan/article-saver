import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import plugin from './clerk-proxy'

const config = vi.hoisted(() => ({
  value: {
    public: {
      clerk: {} as { publishableKey?: string; proxyUrl?: string }
    }
  }
}))

vi.mock('#imports', () => ({
  defineNitroPlugin: (handler: unknown) => handler,
  useRuntimeConfig: (event: unknown) => {
    if (!event) throw new Error('Global runtime configuration is read-only')
    return config.value
  }
}))

function runRequestHook() {
  const hook = vi.fn()
  plugin({ hooks: { hook } } as never)
  expect(hook).toHaveBeenCalledWith('request', expect.any(Function))
  const handler = hook.mock.calls[0]?.[1] as (event: unknown) => void
  handler({})
}

describe('Clerk proxy runtime configuration', () => {
  beforeEach(() => {
    config.value.public.clerk = {}
    vi.stubEnv('CLERK_PROXY_URL', '')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('uses the managed runtime proxy URL instead of a stale override', () => {
    vi.stubEnv('CLERK_PROXY_URL', 'https://app.example.com/api/__clerk')
    config.value.public.clerk = {
      publishableKey: 'pk_live_test',
      proxyUrl: 'https://app.example.com/__clerk'
    }

    runRequestHook()

    expect(config.value.public.clerk.proxyUrl).toBe('https://app.example.com/api/__clerk')
  })

  it('falls back to the proxy path for pk_live_ when CLERK_PROXY_URL is empty', () => {
    config.value.public.clerk = {
      publishableKey: 'pk_live_test',
      proxyUrl: 'https://app.example.com/__clerk'
    }

    runRequestHook()

    expect(config.value.public.clerk.proxyUrl).toBe('/api/__clerk')
  })

  it('removes explicit proxy configuration for development keys', () => {
    config.value.public.clerk = {
      publishableKey: 'pk_test_dev',
      proxyUrl: 'https://app.example.com/__clerk'
    }

    runRequestHook()

    expect(config.value.public.clerk.proxyUrl).toBeUndefined()
  })
})
