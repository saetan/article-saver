/**
 * Trims and lower-cases an email so allowlist comparisons are
 * case/whitespace-insensitive. Shared by `parseAllowlist` (the allowlist
 * side) and `authorizeRequest` (the candidate-email side) so both sides of
 * the comparison are normalised identically.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Parses the `ALLOWED_EMAILS` env var (ADR 0002): a comma-separated list of
 * emails allowed to sign in. Entries are normalised (see `normalizeEmail`)
 * so comparisons are case/whitespace-insensitive; empty entries (e.g.
 * trailing commas or stray whitespace) are dropped.
 *
 * An empty or missing value parses to `[]`, which `authorizeRequest` treats
 * as "nobody is allowed" (fail closed) rather than "no restriction".
 */
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0)
}
