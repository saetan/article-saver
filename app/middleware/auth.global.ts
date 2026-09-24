type AccessStatus = 'unknown' | 'allowed' | 'forbidden'

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

  const { isLoaded, isSignedIn } = useAuth()

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

  const access = useState<AccessStatus>('article-saver-access-status', () => 'unknown')

  if (access.value === 'unknown') {
    try {
      await $fetch('/api/me')
      access.value = 'allowed'
    } catch (error) {
      if (isForbidden(error)) {
        access.value = 'forbidden'
      } else {
        throw error
      }
    }
  }

  if (access.value === 'forbidden') {
    return navigateTo('/not-allowed')
  }
})

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 403
  )
}
