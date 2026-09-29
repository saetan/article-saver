/**
 * Same-origin (CSRF) check for state-changing `/api/**` requests.
 *
 * Browser sessions authenticate with an ambient Clerk cookie, so a foreign
 * site could make the user's browser send a cookie-authenticated POST. Every
 * browser attaches an `Origin` (or at least `Sec-Fetch-Site`) header to such
 * requests, which we use to refuse anything that is not same-origin:
 *
 * - `Origin` present: must equal the request's own origin (scheme + host +
 *   port); the value `null` (sandboxed/opaque origins) is a mismatch.
 * - `Origin` absent: `Sec-Fetch-Site` must be `same-origin`.
 * - neither present (e.g. curl): refused. Non-browser clients must use the
 *   token path below.
 *
 * Extension point (M2, ADR 0005): requests authenticated by an API token are
 * not vulnerable to CSRF (the credential is not ambient) so they can bypass
 * this check. `isBearerTokenRequest` is where that branch lives; it returns
 * false today, and token auth itself is not implemented yet.
 */

export const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
])

export interface CsrfCheckInput {
  method: string
  /** Value of the `Origin` header, if any. */
  origin: string | undefined
  /** Value of the `Sec-Fetch-Site` header, if any. */
  secFetchSite: string | undefined
  /** The request's own origin, e.g. `https://app.example.com`. */
  requestOrigin: string
}

/** M2 extension point: true for requests carrying a valid API token. Always false until #M2 lands. */
export function isBearerTokenRequest(_authorizationHeader: string | undefined): boolean {
  return false
}

export function isSameOriginRequest(input: CsrfCheckInput): boolean {
  if (input.origin !== undefined && input.origin !== '') {
    return input.origin.toLowerCase() === input.requestOrigin.toLowerCase()
  }
  return input.secFetchSite === 'same-origin'
}

/** True when the request must pass {@link isSameOriginRequest} to proceed. */
export function requiresCsrfCheck(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase())
}
