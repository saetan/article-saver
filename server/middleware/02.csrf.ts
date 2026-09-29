import { createError, defineEventHandler, getRequestHeader, getRequestURL } from 'h3'
import { isBearerTokenRequest, isSameOriginRequest, requiresCsrfCheck } from '../auth/csrf'
import { normalizeApiPath } from '../auth/normalize-path'

/**
 * CSRF protection for cookie-authenticated browser sessions: state-changing
 * requests (POST/PUT/PATCH/DELETE) to `/api/**` must be same-origin, else
 * 403. See `server/auth/csrf.ts` for the rules and the M2 Bearer-token
 * extension point.
 *
 * Runs after `01.auth.ts` (filename order), so an unauthenticated request is
 * rejected 401 first. The path goes through the same `normalizeApiPath` as
 * the auth middleware so this check is never looser than what Nitro routes.
 * `X-Forwarded-Host`/`-Proto` are honoured so the check also works behind
 * the Replit proxy; a cross-site page cannot set those headers (they are not
 * CORS-safelisted, so the browser would preflight and be refused).
 */
export default defineEventHandler(async (event) => {
  const normalized = normalizeApiPath(event.path)
  if (!normalized.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }
  if (!normalized.path.startsWith('/api/')) return
  if (!requiresCsrfCheck(event.method)) return

  // M2: API-token requests skip the same-origin check (not ambient credentials).
  if (isBearerTokenRequest(getRequestHeader(event, 'authorization'))) return

  const requestOrigin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin

  const allowed = isSameOriginRequest({
    method: event.method,
    origin: getRequestHeader(event, 'origin'),
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
    requestOrigin
  })

  if (!allowed) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden (cross-origin request)' })
  }
})
