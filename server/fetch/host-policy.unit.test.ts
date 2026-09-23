import dns from 'node:dns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertHostAllowedIfLiteral, createSafeLookup, isTestOverrideHost } from './host-policy'
import { BlockedUrlError } from './errors'

describe('assertHostAllowedIfLiteral', () => {
  it('does nothing for a hostname (not an IP literal)', () => {
    expect(() => assertHostAllowedIfLiteral('http://example.com/', 'example.com', {})).not.toThrow()
  })

  it('allows a public IPv4 literal', () => {
    expect(() => assertHostAllowedIfLiteral('http://8.8.8.8/', '8.8.8.8', {})).not.toThrow()
  })

  it('blocks a private IPv4 literal', () => {
    expect(() => assertHostAllowedIfLiteral('http://127.0.0.1/', '127.0.0.1', {})).toThrow(
      BlockedUrlError
    )
  })

  it('blocks a bracketed private IPv6 literal', () => {
    expect(() => assertHostAllowedIfLiteral('http://[::1]/', '[::1]', {})).toThrow(BlockedUrlError)
  })

  it('lets the test-only allowlist through when NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(() =>
      assertHostAllowedIfLiteral('http://127.0.0.1/', '127.0.0.1', { allowHosts: ['127.0.0.1'] })
    ).not.toThrow()
  })

  it('does not bypass for hosts absent from the allowlist', () => {
    expect(() =>
      assertHostAllowedIfLiteral('http://127.0.0.1/', '127.0.0.1', { allowHosts: ['other-host'] })
    ).toThrow(BlockedUrlError)
  })
})

describe('isTestOverrideHost', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEnvVar = process.env.SAFE_FETCH_ALLOW_HOSTS

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalEnvVar === undefined) delete process.env.SAFE_FETCH_ALLOW_HOSTS
    else process.env.SAFE_FETCH_ALLOW_HOSTS = originalEnvVar
  })

  it('is never honoured outside NODE_ENV=test, even if requested', () => {
    process.env.NODE_ENV = 'production'
    expect(isTestOverrideHost('127.0.0.1', { allowHosts: ['127.0.0.1'] })).toBe(false)
  })

  it('reads a comma-separated SAFE_FETCH_ALLOW_HOSTS env var, only under NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test'
    process.env.SAFE_FETCH_ALLOW_HOSTS = 'localhost, 127.0.0.1'
    expect(isTestOverrideHost('localhost', {})).toBe(true)
    expect(isTestOverrideHost('127.0.0.1', {})).toBe(true)
    expect(isTestOverrideHost('evil.example', {})).toBe(false)

    process.env.NODE_ENV = 'production'
    expect(isTestOverrideHost('localhost', {})).toBe(false)
  })
})

describe('createSafeLookup', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockDnsLookup(addresses: Array<{ address: string; family: number }>) {
    return vi.spyOn(dns, 'lookup').mockImplementation(((..._args: unknown[]) => {
      const args = _args as unknown as [
        string,
        unknown,
        (err: NodeJS.ErrnoException | null, addrs: unknown) => void
      ]
      const callback = args[2]
      callback(null, addresses)
    }) as typeof dns.lookup)
  }

  it('pins to a validated public address', async () => {
    mockDnsLookup([{ address: '93.184.216.34', family: 4 }])
    const lookup = createSafeLookup('http://example.com/', {})

    const result = await new Promise((resolve, reject) => {
      lookup('example.com', { family: 0, hints: 0 }, (err, address, family) => {
        if (err) reject(err)
        else resolve({ address, family })
      })
    })

    expect(result).toEqual({ address: '93.184.216.34', family: 4 })
  })

  it('drops private addresses and keeps only public ones when DNS returns a mix', async () => {
    mockDnsLookup([
      { address: '10.0.0.5', family: 4 },
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ])
    const lookup = createSafeLookup('http://example.com/', {})

    const result = await new Promise((resolve, reject) => {
      lookup('example.com', { all: true, family: 0, hints: 0 }, (err, addresses) => {
        if (err) reject(err)
        else resolve(addresses)
      })
    })

    expect(result).toEqual([{ address: '93.184.216.34', family: 4 }])
  })

  it('rejects when every resolved address is non-public', async () => {
    mockDnsLookup([
      { address: '10.0.0.5', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ])
    const lookup = createSafeLookup('http://internal.example/', {})

    await expect(
      new Promise((resolve, reject) => {
        lookup('internal.example', { family: 0, hints: 0 }, (err, address) => {
          if (err) reject(err)
          else resolve(address)
        })
      })
    ).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('bypasses validation entirely for an allowlisted test host', async () => {
    mockDnsLookup([{ address: '127.0.0.1', family: 4 }])
    const lookup = createSafeLookup('http://localhost:1234/', { allowHosts: ['localhost'] })

    const result = await new Promise((resolve, reject) => {
      lookup('localhost', { family: 0, hints: 0 }, (err, address, family) => {
        if (err) reject(err)
        else resolve({ address, family })
      })
    })

    expect(result).toEqual({ address: '127.0.0.1', family: 4 })
  })

  it('propagates a DNS resolution error', async () => {
    const dnsError = Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })
    vi.spyOn(dns, 'lookup').mockImplementation(((..._args: unknown[]) => {
      const args = _args as unknown as [
        string,
        unknown,
        (err: NodeJS.ErrnoException | null) => void
      ]
      args[2](dnsError)
    }) as typeof dns.lookup)

    const lookup = createSafeLookup('http://nowhere.invalid/', {})

    await expect(
      new Promise((resolve, reject) => {
        lookup('nowhere.invalid', { family: 0, hints: 0 }, (err) => {
          if (err) reject(err)
          else resolve(undefined)
        })
      })
    ).rejects.toThrow('ENOTFOUND')
  })
})

beforeEach(() => {
  // Sanity check the assumption every test above relies on.
  if (process.env.NODE_ENV !== 'test') throw new Error('expected NODE_ENV=test under vitest')
})
