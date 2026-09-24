/**
 * Parses the `ALLOWED_EMAILS` env var (ADR 0002): a comma-separated list of
 * emails allowed to sign in. Entries are trimmed and lower-cased so
 * comparisons are case-insensitive; empty entries (e.g. trailing commas or
 * stray whitespace) are dropped.
 *
 * An empty or missing value parses to `[]`, which `authorizeRequest` treats
 * as "nobody is allowed" (fail closed) rather than "no restriction".
 */
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
}
