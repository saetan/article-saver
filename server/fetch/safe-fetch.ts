import { Agent, request as undiciRequest } from 'undici'
import { assertHostAllowedIfLiteral, createSafeLookup, type HostPolicyOptions } from './host-policy'
import { InvalidUrlError, TimeoutError, TooLargeError, TooManyRedirectsError } from './errors'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_USER_AGENT = 'ArticleSaverBot/1.0 (+https://github.com/saetan/article-saver)'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export interface SafeFetchOptions extends HostPolicyOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array
  /** Total time budget for the whole call, including all redirect hops. Default 10s. */
  timeoutMs?: number
  /** Max response body size, enforced while streaming. Default 10 MB. */
  maxBytes?: number
  /** Max number of redirect hops to follow. Default 5. */
  maxRedirects?: number
  userAgent?: string
  signal?: AbortSignal
}

export interface SafeFetchResponse {
  status: number
  /** The final URL after following any redirects. */
  url: string
  headers: Record<string, string | string[]>
  body: Uint8Array
  text(): string
}

function validateUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new InvalidUrlError(`"${input}" is not a valid URL`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidUrlError(
      `Unsupported protocol "${url.protocol}" on "${input}" - only http: and https: are allowed`
    )
  }

  if (url.username !== '' || url.password !== '') {
    throw new InvalidUrlError(`"${input}" embeds credentials, which is not allowed`)
  }

  return url
}

async function readBodyWithLimit(
  body: AsyncIterable<Uint8Array> & { destroy?: (err?: Error) => void },
  maxBytes: number,
  url: string
): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of body) {
    total += chunk.length
    if (total > maxBytes) {
      body.destroy?.(new Error('response body exceeded the configured size limit'))
      throw new TooLargeError(`Response body from ${url} exceeded the ${maxBytes} byte limit`)
    }
    chunks.push(Buffer.from(chunk))
  }

  return new Uint8Array(Buffer.concat(chunks, total))
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * Fetches `input` while guarding against SSRF: only `http:`/`https:`, no
 * embedded credentials, every hostname and IP literal (including every hop
 * of a redirect chain, and every address a hostname resolves to) is
 * validated against {@link isBlockedIp} at the moment of connecting - not
 * ahead of time - which closes the DNS-rebinding TOCTOU gap. See
 * `server/fetch/host-policy.ts` for how the pinning works.
 *
 * Enforces a total timeout (default 10s) across all redirect hops, a max
 * response size (default 10 MB) enforced while streaming rather than only
 * via `Content-Length`, and a max redirect count (default 5).
 */
export async function safeFetch(
  input: string,
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT

  const totalController = new AbortController()
  const timeoutError = new TimeoutError(`Request to ${input} timed out after ${timeoutMs}ms`)
  const timer = setTimeout(() => totalController.abort(timeoutError), timeoutMs)

  if (opts.signal) {
    if (opts.signal.aborted) totalController.abort(opts.signal.reason)
    else
      opts.signal.addEventListener('abort', () => totalController.abort(opts.signal!.reason), {
        once: true
      })
  }

  const rethrowTimeoutIfAborted = (err: unknown): never => {
    if (totalController.signal.aborted && totalController.signal.reason === timeoutError) {
      throw timeoutError
    }
    throw err
  }

  try {
    let currentUrl = validateUrl(input)
    let method = opts.method ?? 'GET'
    let bodyPayload = opts.body
    let hops = 0

    for (;;) {
      assertHostAllowedIfLiteral(currentUrl.href, currentUrl.hostname, opts)

      const agent = new Agent({ connect: { lookup: createSafeLookup(currentUrl.href, opts) } })

      try {
        const response = await undiciRequest(currentUrl.href, {
          method,
          headers: { 'user-agent': userAgent, ...opts.headers },
          body: bodyPayload,
          dispatcher: agent,
          signal: totalController.signal
        }).catch(rethrowTimeoutIfAborted)

        if (REDIRECT_STATUSES.has(response.statusCode)) {
          await response.body.dump().catch(() => undefined)

          const location = headerValue(response.headers, 'location')
          if (!location) {
            throw new InvalidUrlError(
              `Redirect (${response.statusCode}) from ${currentUrl.href} has no Location header`
            )
          }

          hops += 1
          if (hops > maxRedirects) {
            throw new TooManyRedirectsError(`Exceeded ${maxRedirects} redirects fetching ${input}`)
          }

          const nextUrl = validateUrl(new URL(location, currentUrl).href)

          // 301/302 historically downgrade non-GET/HEAD redirects to GET, matching fetch()/curl behaviour.
          if (
            (response.statusCode === 301 || response.statusCode === 302) &&
            method !== 'GET' &&
            method !== 'HEAD'
          ) {
            method = 'GET'
            bodyPayload = undefined
          }

          currentUrl = nextUrl
          continue
        }

        const contentLength = headerValue(response.headers, 'content-length')
        if (contentLength !== undefined && Number(contentLength) > maxBytes) {
          await response.body.dump().catch(() => undefined)
          throw new TooLargeError(
            `Response from ${currentUrl.href} declared Content-Length ${contentLength}, exceeding the ${maxBytes} byte limit`
          )
        }

        const bodyBytes = await readBodyWithLimit(response.body, maxBytes, currentUrl.href).catch(
          rethrowTimeoutIfAborted
        )

        const headers: Record<string, string | string[]> = {}
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers[key] = value
        }

        return {
          status: response.statusCode,
          url: currentUrl.href,
          headers,
          body: bodyBytes,
          text: () => Buffer.from(bodyBytes).toString('utf-8')
        }
      } finally {
        await agent.close()
      }
    }
  } finally {
    clearTimeout(timer)
  }
}
