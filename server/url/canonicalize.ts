import { InvalidCanonicalUrlError } from './errors'

/**
 * Tracking query parameters stripped regardless of host (ADR 0013,
 * `CONTEXT.md`: Canonical URL). Anything else is treated as *functional*
 * (e.g. YouTube's `v`, a search's `q`) and kept — we canonicalise against a
 * denylist of known tracking noise, not an allowlist, since we can't know
 * every site's functional params up front.
 */
const TRACKING_PARAM_PREFIXES = ['utm_']
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'si',
  'igsh',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref_src',
  'ref_url'
])

/** `s` and `t` are only tracking noise on X's share links; elsewhere they can be functional. */
const X_SHARE_PARAMS = new Set(['s', 't'])

/** Hosts that collapse onto a single canonical host. */
const HOST_ALIASES: Record<string, string> = {
  'twitter.com': 'x.com',
  'mobile.twitter.com': 'x.com',
  'www.x.com': 'x.com',
  'www.threads.net': 'threads.net',
  'www.instagram.com': 'instagram.com'
}

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443'
}

function isTrackingParam(key: string, host: string): boolean {
  const lowerKey = key.toLowerCase()
  if (TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) return true
  if (TRACKING_PARAMS.has(lowerKey)) return true
  if (host === 'x.com' && X_SHARE_PARAMS.has(lowerKey)) return true
  return false
}

/**
 * Normalises a URL into a stable, comparable form for duplicate detection
 * (ADR 0013). Pure: no network access, no I/O.
 *
 * Rules:
 * - Scheme and host are lower-cased; default ports (`:80`, `:443`) removed.
 * - Known social hosts collapse onto one canonical host: `twitter.com` and
 *   `mobile.twitter.com` become `x.com`; `www.` is dropped for `x.com`,
 *   `threads.net` and `instagram.com` specifically (not hosts generally).
 * - The `#fragment` is dropped.
 * - The path's trailing slash is trimmed, except for the root `/`.
 * - Known tracking query params (`utm_*`, `fbclid`, `gclid`, `si`, `igsh`,
 *   `igshid`, `mc_cid`, `mc_eid`, `ref_src`, `ref_url`, and X's `s`/`t` share
 *   params on `x.com` only) are removed; every other query param is kept,
 *   since it may be functional (e.g. `v` on a YouTube `/watch` URL) rather
 *   than tracking noise. Remaining params are sorted by key (then value)
 *   for stability.
 *
 * @throws {InvalidCanonicalUrlError} if `url` cannot be parsed as a URL.
 */
export function canonicalizeUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new InvalidCanonicalUrlError(url, error)
  }

  const scheme = parsed.protocol.toLowerCase()
  let host = parsed.hostname.toLowerCase()
  host = HOST_ALIASES[host] ?? host

  const port = parsed.port && parsed.port !== DEFAULT_PORTS[scheme] ? `:${parsed.port}` : ''

  let path = parsed.pathname
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)

  const keptParams: Array<[string, string]> = []
  for (const [key, value] of parsed.searchParams) {
    if (isTrackingParam(key, host)) continue
    keptParams.push([key, value])
  }
  keptParams.sort(([keyA, valueA], [keyB, valueB]) => {
    if (keyA !== keyB) return keyA < keyB ? -1 : 1
    if (valueA !== valueB) return valueA < valueB ? -1 : 1
    return 0
  })
  const search = new URLSearchParams(keptParams).toString()

  return `${scheme}//${host}${port}${path}${search ? `?${search}` : ''}`
}
