/**
 * The slice of Clerk's Backend `User` object this module needs. Kept
 * minimal (rather than importing `@clerk/backend`'s `User` class) so it's
 * trivial to construct in unit tests without touching the Clerk SDK.
 */
export interface ClerkUserLike {
  primaryEmailAddressId: string | null
  emailAddresses: ReadonlyArray<{
    id: string
    emailAddress: string
    verification: { status: string } | null
  }>
}

/**
 * Resolves the user's primary email address, but only if it is verified.
 * Returns `null` if there is no primary email, it isn't in
 * `emailAddresses`, or it hasn't been verified.
 *
 * This is the only place allowed to decide "which email represents this
 * user" for authorisation purposes — never trust a client-supplied email
 * (ADR 0002); this always resolves from the Clerk-provided user record.
 */
export function resolvePrimaryVerifiedEmail(user: ClerkUserLike): string | null {
  if (!user.primaryEmailAddressId) return null

  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
  if (!primary) return null
  if (primary.verification?.status !== 'verified') return null

  return primary.emailAddress
}
