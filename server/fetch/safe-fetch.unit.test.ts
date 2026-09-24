import dns from 'node:dns'
import http, { type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { safeFetch, validateUrl } from './safe-fetch'
import {
  BlockedUrlError,
  InvalidUrlError,
  TimeoutError,
  TooLargeError,
  TooManyRedirectsError
} from './errors'

async function startServer(
  handler: http.RequestListener
): Promise<{ server: Server; url: string }> {
  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}` }
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  )
}

describe('safeFetch', () => {
  let servers: Server[] = []

  afterEach(async () => {
    await Promise.all(servers.map(stopServer))
    servers = []
    vi.restoreAllMocks()
  })

  it('rejects non-http(s) protocols', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toBeInstanceOf(InvalidUrlError)
    await expect(safeFetch('ftp://example.com/')).rejects.toBeInstanceOf(InvalidUrlError)
  })

  it('rejects URLs with embedded credentials', async () => {
    // https (not http) so this exercises the credentials check specifically,
    // rather than being trivially rejected by the https-only check first.
    await expect(safeFetch('https://user:pass@example.com/')).rejects.toBeInstanceOf(
      InvalidUrlError
    )
  })

  it('rejects plain http for a host not covered by the test override', async () => {
    await expect(safeFetch('http://example.com/')).rejects.toBeInstanceOf(InvalidUrlError)
  })

  it('blocks a request to a loopback IP literal without the test override', async () => {
    // https (not http) so this exercises the IP-blocking check specifically,
    // rather than being trivially rejected by the https-only check first.
    await expect(safeFetch('https://127.0.0.1:1/')).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('blocks a request to a numeric-hostname loopback address (decimal form)', async () => {
    await expect(safeFetch('https://2130706433/')).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('blocks a request to a numeric-hostname loopback address (hex/short form)', async () => {
    await expect(safeFetch('https://0x7f.1/')).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('blocks a request to an IPv6 loopback literal', async () => {
    await expect(safeFetch('https://[::1]:1/')).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('blocks an IPv4-mapped IPv6 loopback literal', async () => {
    await expect(safeFetch('https://[::ffff:127.0.0.1]:1/')).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('blocks a hostname (not an IP literal) whose DNS resolution is entirely non-public', async () => {
    // Unlike the literal-IP tests above (caught by the assertHostAllowedIfLiteral
    // fast path before any connection is attempted), this exercises the other
    // path: a real hostname that goes through the undici Agent's connect.lookup
    // (createSafeLookup) at actual connect time. See host-policy.unit.test.ts's
    // "drops private addresses and keeps only public ones when DNS returns a
    // mix" for coverage of the mixed-address filtering logic in isolation.
    vi.spyOn(dns, 'lookup').mockImplementation(((...args: unknown[]) => {
      const callback = args[2] as (
        err: null,
        addrs: Array<{ address: string; family: number }>
      ) => void
      callback(null, [
        { address: '10.0.0.5', family: 4 },
        { address: '127.0.0.1', family: 4 }
      ])
    }) as typeof dns.lookup)

    await expect(safeFetch('https://internal.article-saver.test/')).rejects.toBeInstanceOf(
      BlockedUrlError
    )
  })

  it('succeeds against a local stub server via the test-only allowHosts override', async () => {
    const { server, url } = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('hello world')
    })
    servers.push(server)

    const result = await safeFetch(url + '/', { allowHosts: ['127.0.0.1'] })

    expect(result.status).toBe(200)
    expect(result.text()).toBe('hello world')
    expect(result.url).toBe(url + '/')
  })

  it('does not bypass SSRF protection when allowHosts is set for a different host', async () => {
    const { server, url } = await startServer((_req, res) => res.end('nope'))
    servers.push(server)

    // https (not http) so this exercises IP-range blocking specifically -
    // the https-only check has its own dedicated coverage below.
    const secureUrl = url.replace('http://', 'https://')
    await expect(
      safeFetch(secureUrl + '/', { allowHosts: ['not-this-host'] })
    ).rejects.toBeInstanceOf(BlockedUrlError)
  })

  it('follows a chain of redirects and revalidates each hop', async () => {
    const { server: target, url: targetUrl } = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('final destination')
    })
    servers.push(target)

    const { server: hop2, url: hop2Url } = await startServer((_req, res) => {
      res.writeHead(302, { location: targetUrl + '/' })
      res.end()
    })
    servers.push(hop2)

    const { server: hop1, url: hop1Url } = await startServer((_req, res) => {
      res.writeHead(302, { location: hop2Url + '/' })
      res.end()
    })
    servers.push(hop1)

    const result = await safeFetch(hop1Url + '/', { allowHosts: ['127.0.0.1'] })
    expect(result.status).toBe(200)
    expect(result.text()).toBe('final destination')
    expect(result.url).toBe(targetUrl + '/')
  })

  it('drops authorization/cookie/proxy-authorization on a cross-origin redirect', async () => {
    let receivedByTarget: http.IncomingHttpHeaders = {}
    const { server: target, url: targetUrl } = await startServer((req, res) => {
      receivedByTarget = req.headers
      res.end('ok')
    })
    servers.push(target)
    // A different port on the same host is already a different origin
    // (scheme+host+PORT), which is exactly what fetch()'s credential-leak
    // protection keys on.
    expect(new URL(targetUrl).port).not.toBe('')

    const { server: hop, url: hopUrl } = await startServer((_req, res) => {
      res.writeHead(302, { location: targetUrl + '/' })
      res.end()
    })
    servers.push(hop)
    expect(new URL(hopUrl).origin).not.toBe(new URL(targetUrl).origin)

    await safeFetch(hopUrl + '/', {
      allowHosts: ['127.0.0.1'],
      headers: {
        authorization: 'Bearer secret-token',
        Cookie: 'session=secret',
        'Proxy-Authorization': 'Basic secret',
        'x-benign-header': 'keep-me'
      }
    })

    expect(receivedByTarget.authorization).toBeUndefined()
    expect(receivedByTarget.cookie).toBeUndefined()
    expect(receivedByTarget['proxy-authorization']).toBeUndefined()
    expect(receivedByTarget['x-benign-header']).toBe('keep-me')
  })

  it('keeps authorization/cookie on a same-origin redirect (same scheme, host and port)', async () => {
    let receivedByTarget: http.IncomingHttpHeaders = {}
    let redirected = false
    const { server, url } = await startServer((req, res) => {
      if (!redirected) {
        redirected = true
        res.writeHead(302, { location: '/next' })
        res.end()
        return
      }
      receivedByTarget = req.headers
      res.end('ok')
    })
    servers.push(server)

    await safeFetch(url + '/', {
      allowHosts: ['127.0.0.1'],
      headers: { authorization: 'Bearer secret-token' }
    })

    expect(receivedByTarget.authorization).toBe('Bearer secret-token')
  })

  it('blocks a redirect that points at a private IP not covered by allowHosts', async () => {
    const { server, url } = await startServer((_req, res) => {
      // https so this specifically exercises IP-range blocking on the
      // redirect hop, not the (separately tested) https-only protocol check.
      res.writeHead(302, { location: 'https://10.0.0.5/internal' })
      res.end()
    })
    servers.push(server)

    // Allowlist only the initial hostname ("localhost") - the redirect target
    // (a bare RFC1918 IP literal) is a different hostname string and must
    // still be rejected, proving each hop is revalidated independently.
    const localUrl = url.replace('127.0.0.1', 'localhost')
    await expect(safeFetch(localUrl + '/', { allowHosts: ['localhost'] })).rejects.toBeInstanceOf(
      BlockedUrlError
    )
  })

  it('rejects a redirect to plain http for a host not covered by the test override', async () => {
    // The initial hop is over plain http too (our stub server can't speak
    // real TLS), but permitted via allowHosts - standing in for "a hop that
    // has already been validated". The redirect target is a different,
    // non-allowlisted hostname over plain http: this proves the https-only
    // check is re-applied independently on every hop rather than being
    // "inherited" once the chain starts, which is exactly what stops an
    // https -> http downgrade partway through a redirect chain.
    const { server, url } = await startServer((_req, res) => {
      res.writeHead(302, { location: 'http://not-allowlisted.article-saver.test/secure-only' })
      res.end()
    })
    servers.push(server)

    await expect(safeFetch(url + '/', { allowHosts: ['127.0.0.1'] })).rejects.toBeInstanceOf(
      InvalidUrlError
    )
  })

  it('gives up after maxRedirects hops', async () => {
    let hops = 0
    const { server, url } = await startServer((_req, res) => {
      hops += 1
      res.writeHead(302, { location: '/next-' + hops })
      res.end()
    })
    servers.push(server)

    await expect(
      safeFetch(url + '/', { allowHosts: ['127.0.0.1'], maxRedirects: 2 })
    ).rejects.toBeInstanceOf(TooManyRedirectsError)
  })

  it('rejects an oversized response declared via Content-Length before reading the body', async () => {
    const { server, url } = await startServer((_req, res) => {
      res.writeHead(200, { 'content-length': String(1024 * 1024) })
      res.end(Buffer.alloc(10))
    })
    servers.push(server)

    await expect(
      safeFetch(url + '/', { allowHosts: ['127.0.0.1'], maxBytes: 100 })
    ).rejects.toBeInstanceOf(TooLargeError)
  })

  it('rejects an oversized response with no Content-Length, enforced while streaming', async () => {
    const { server, url } = await startServer((_req, res) => {
      res.writeHead(200, { 'transfer-encoding': 'chunked' })
      res.write(Buffer.alloc(200, 'a'))
      res.write(Buffer.alloc(200, 'b'))
      res.end()
    })
    servers.push(server)

    await expect(
      safeFetch(url + '/', { allowHosts: ['127.0.0.1'], maxBytes: 100 })
    ).rejects.toBeInstanceOf(TooLargeError)
  })

  it('times out a slow server', async () => {
    const { server, url } = await startServer((_req, res) => {
      // Never respond within the test's timeout budget.
      setTimeout(() => res.end('too late'), 5_000)
    })
    servers.push(server)

    await expect(
      safeFetch(url + '/', { allowHosts: ['127.0.0.1'], timeoutMs: 50 })
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it('sends a sensible default User-Agent', async () => {
    let receivedUserAgent = ''
    const { server, url } = await startServer((req, res) => {
      receivedUserAgent = req.headers['user-agent'] ?? ''
      res.end('ok')
    })
    servers.push(server)

    await safeFetch(url + '/', { allowHosts: ['127.0.0.1'] })
    expect(receivedUserAgent).toContain('ArticleSaverBot')
  })

  it('requests identity encoding by default, so responses are never compressed', async () => {
    let receivedAcceptEncoding = ''
    const { server, url } = await startServer((req, res) => {
      receivedAcceptEncoding = req.headers['accept-encoding'] ?? ''
      res.end('ok')
    })
    servers.push(server)

    await safeFetch(url + '/', { allowHosts: ['127.0.0.1'] })
    expect(receivedAcceptEncoding).toBe('identity')
  })

  it('lets the caller override the default accept-encoding', async () => {
    let receivedAcceptEncoding = ''
    const { server, url } = await startServer((req, res) => {
      receivedAcceptEncoding = req.headers['accept-encoding'] ?? ''
      res.end('ok')
    })
    servers.push(server)

    await safeFetch(url + '/', {
      allowHosts: ['127.0.0.1'],
      headers: { 'Accept-Encoding': 'gzip' }
    })
    expect(receivedAcceptEncoding).toBe('gzip')
  })
})

describe('validateUrl (https-only enforcement)', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('accepts an https URL', () => {
    expect(() => validateUrl('https://example.com/', {})).not.toThrow()
  })

  it('rejects a plain http URL, with a message that says plain http is not supported', () => {
    expect(() => validateUrl('http://example.com/', {})).toThrow(InvalidUrlError)
    expect(() => validateUrl('http://example.com/', {})).toThrow(/http is not supported/i)
  })

  it('rejects what would be an https -> http downgrade on a redirect hop', () => {
    // This is exactly what safeFetch does for every redirect hop: resolve
    // the Location header against the current URL, then re-validate it.
    // Re-validating an http Location the same way as any other input is
    // what makes a downgrade mid-chain impossible - there's no separate
    // "was the previous hop https" state to smuggle past.
    const redirectTarget = new URL('http://internal.example/', new URL('https://example.com/'))
    expect(() => validateUrl(redirectTarget.href, {})).toThrow(InvalidUrlError)
  })

  it('allows http only for a host in allowHosts, and only under NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(() => validateUrl('http://127.0.0.1/', { allowHosts: ['127.0.0.1'] })).not.toThrow()
  })

  it('never allows http via allowHosts outside NODE_ENV=test, even for an allowlisted host', () => {
    process.env.NODE_ENV = 'production'
    expect(() => validateUrl('http://127.0.0.1/', { allowHosts: ['127.0.0.1'] })).toThrow(
      InvalidUrlError
    )
  })

  it('still rejects http for a host absent from allowHosts, under NODE_ENV=test', () => {
    expect(() => validateUrl('http://127.0.0.1/', { allowHosts: ['other-host'] })).toThrow(
      InvalidUrlError
    )
  })
})
