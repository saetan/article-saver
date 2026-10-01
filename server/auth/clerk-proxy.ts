import { normalizeApiPath } from './normalize-path'

/** Where Replit-managed Clerk expects the Frontend API proxy to live. */
export const CLERK_PROXY_PATH = '/api/__clerk'

/**
 * True when a raw request path is exactly the Clerk proxy path or one of its
 * descendants, after the same normalisation the auth middleware uses
 * (percent-decoding, slash collapsing, dot-segment resolution), so
 * `/api/__clerk/../items` is NOT a proxy path and stays protected. A path that
 * fails to decode is never a proxy path.
 */
export function isClerkProxyPath(rawPath: string): boolean {
  const normalized = normalizeApiPath(rawPath)
  if (!normalized.ok) return false
  return normalized.path === CLERK_PROXY_PATH || normalized.path.startsWith(`${CLERK_PROXY_PATH}/`)
}

/**
 * Replit-managed Clerk provisions a development instance (`pk_test_`) for
 * preview and a production instance (`pk_live_`) for published apps. Only the
 * production instance needs (or supports) the proxy.
 */
export function isProductionPublishableKey(publishableKey: string | undefined): boolean {
  return publishableKey?.startsWith('pk_live_') ?? false
}
