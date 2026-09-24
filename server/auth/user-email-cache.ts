interface CacheEntry {
  email: string | null
  expiresAt: number
}

const DEFAULT_TTL_MS = 60_000

/**
 * A tiny process-wide TTL cache for `userId -> resolvePrimaryVerifiedEmail`
 * results, so the auth middleware doesn't call the Clerk API on every
 * request. Deliberately short-lived: a revoked/changed email should take
 * effect quickly.
 */
export class UserEmailCache {
  private readonly entries = new Map<string, CacheEntry>()

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  get(userId: string, now = Date.now()): string | null | undefined {
    const entry = this.entries.get(userId)
    if (!entry) return undefined
    if (entry.expiresAt <= now) {
      this.entries.delete(userId)
      return undefined
    }
    return entry.email
  }

  set(userId: string, email: string | null, now = Date.now()): void {
    this.entries.set(userId, { email, expiresAt: now + this.ttlMs })
  }

  clear(): void {
    this.entries.clear()
  }
}

let sharedCache: UserEmailCache | undefined

/** The process-wide cache instance used by the auth middleware. */
export function useUserEmailCache(): UserEmailCache {
  sharedCache ??= new UserEmailCache()
  return sharedCache
}
