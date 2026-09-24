export type NormalizedPath = { ok: true; path: string } | { ok: false }

/**
 * Normalises a raw request path the same way Nitro's router effectively
 * does before matching a route, so the auth middleware's "is this
 * `/api/**`?" check can never be looser than what actually gets routed
 * (security review round 1, issue #5): the router percent-decodes the
 * path, so a naive `event.path.startsWith('/api/')` check can be bypassed
 * with e.g. `/%61pi/me` (decodes to `/api/me`) while the raw string
 * doesn't start with `/api/`.
 *
 * Steps, in order:
 * 1. Strip the query string / fragment.
 * 2. Percent-decode once (matching the router's single decode — matches
 *    `%61pi` -> `api` and `health%2F..%2Fme` -> `health/../me`). A
 *    malformed sequence (e.g. a truncated multi-byte escape) fails this
 *    step; callers should treat that as a 400, never as "skip auth".
 * 3. Collapse repeated slashes (`//api/me` -> `/api/me`).
 * 4. Resolve `.`/`..` segments (`/api/health/../me` -> `/api/me`),
 *    clamped at the root — a `..` above root is dropped rather than
 *    escaping it.
 * 5. Lower-case the result, so the `/api` boundary check (and the
 *    `/api/health` public exemption) is case-insensitive and can't be
 *    dodged with `/API/me`.
 */
export function normalizeApiPath(rawPath: string): NormalizedPath {
  const withoutQuery = rawPath.split(/[?#]/)[0] ?? rawPath

  let decoded: string
  try {
    decoded = decodeURIComponent(withoutQuery)
  } catch {
    return { ok: false }
  }

  const collapsed = decoded.replace(/\/{2,}/g, '/')
  const resolved = resolveDotSegments(collapsed)

  return { ok: true, path: resolved.toLowerCase() }
}

function resolveDotSegments(path: string): string {
  const segments = path.split('/')
  const resolved: string[] = []

  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }

  return `/${resolved.join('/')}`
}
