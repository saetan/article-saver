import { normalizeEmail } from './allowlist'

export interface AuthorizeRequestInput {
  /** The authenticated Clerk user id, or `null`/`undefined` if unauthenticated. */
  userId: string | null | undefined
  /**
   * The user's primary email address, already resolved server-side and
   * already confirmed verified (see `resolvePrimaryVerifiedEmail`) — or
   * `null` if there is no verified primary email. Never a client-supplied
   * value.
   */
  primaryVerifiedEmail: string | null | undefined
  /**
   * The parsed allowlist (see `parseAllowlist`): already trimmed and
   * lower-cased.
   */
  allowlist: readonly string[]
}

export type AuthorizeResult =
  | { authorized: true; userId: string }
  | { authorized: false; status: 401 }
  | { authorized: false; status: 403 }

/**
 * The pure authorisation seam (ADR 0002): given an authenticated user id, a
 * server-resolved verified email and the parsed allowlist, decides whether
 * the request proceeds (200), is unauthenticated (401), or is authenticated
 * but not allowlisted (403).
 *
 * Fails closed: an empty allowlist authorizes nobody, even a verified
 * email, because an empty/missing `ALLOWED_EMAILS` should never mean "no
 * restriction".
 */
export function authorizeRequest(input: AuthorizeRequestInput): AuthorizeResult {
  if (!input.userId) {
    return { authorized: false, status: 401 }
  }

  if (input.allowlist.length === 0) {
    return { authorized: false, status: 403 }
  }

  if (!input.primaryVerifiedEmail) {
    return { authorized: false, status: 403 }
  }

  if (!input.allowlist.includes(normalizeEmail(input.primaryVerifiedEmail))) {
    return { authorized: false, status: 403 }
  }

  return { authorized: true, userId: input.userId }
}
