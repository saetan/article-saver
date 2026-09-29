type AccessStatus = 'unknown' | 'allowed' | 'forbidden'

interface AccessState {
  /** Which Clerk user this cached status is for — `null` before sign-in. */
  userId: string | null
  status: AccessStatus
}

/**
 * Client-side route guard (ADR 0011: SPA mode, no server-rendered pages to
 * gate). This is defence in depth for UX only — the real enforcement is the
 * `/api/**` server middleware (`server/middleware/auth.ts`); a user can't
 * get real data just by bypassing this.
 *
 * - Not signed in and not already headed to `/sign-in` -> redirect there.
 * - Signed in but not allowlisted (learned from `/api/me` returning 403)
 *   -> redirect to `/not-allowed`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/sign-in') return

  const { isLoaded, isSignedIn, userId } = useAuth()

  if (!isLoaded.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        isLoaded,
        (loaded) => {
          if (loaded) {
            stop()
            resolve()
          }
        },
        { immediate: true }
      )
    })
  }

  if (!isSignedIn.value) {
    return navigateTo('/sign-in')
  }

  if (to.path === '/not-allowed') return

  // Keyed by userId (security review round 1, #5): otherwise a cached
  // 'allowed' from one Clerk session stays put after that user signs out
  // and a different user signs in within the same SPA session, skipping
  // the /api/me check for them. UX only — the server still enforces this
  // on every request regardless of what this cache says.
  const currentUserId = userId.value ?? null
  const access = useState<AccessState>('article-saver-access-status', () => ({
    userId: null,
    status: 'unknown'
  }))

  if (access.value.userId !== currentUserId) {
    access.value = { userId: currentUserId, status: 'unknown' }
  }

  if (access.value.status === 'unknown') {
    try {
      await $fetch('/api/me')
      access.value = { userId: currentUserId, status: 'allowed' }
    } catch (error) {
      const statusCode = getStatusCode(error)

      if (statusCode === 403) {
        access.value = { userId: currentUserId, status: 'forbidden' }
      } else if (statusCode === 401) {
        // Clerk's client thinks we're signed in but the server doesn't
        // (a stale/expired session, clock skew, cookie not propagated
        // yet, ...) — security review round 2, #5. Don't throw and let
        // Nuxt render an error page for what's really just "please sign
        // in again"; sign out client-side and send the user back to
        // /sign-in instead.
        access.value = { userId: null, status: 'unknown' }
        const clerk = useClerk()
        await clerk.value?.signOut()
        return navigateTo({ path: '/sign-in', query: { reason: 'session-expired' } })
      } else {
        // Anything else (network failure, 500, ...) is genuinely
        // unexpected — let it surface as an error.
        throw error
      }
    }
  }

  if (access.value.status === 'forbidden') {
    return navigateTo('/not-allowed')
  }
})

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined
  const statusCode = (error as { statusCode?: unknown }).statusCode
  return typeof statusCode === 'number' ? statusCode : undefined
}
