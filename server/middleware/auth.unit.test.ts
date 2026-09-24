import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const getUserMock = vi.fn()

vi.mock('@clerk/nuxt/server', () => ({
  clerkClient: () => ({ users: { getUser: getUserMock } })
}))

// Imported after the mock so the mocked module is in place first.
const { default: authMiddleware } = await import('./auth')
const { useUserEmailCache } = await import('../auth/user-email-cache')

const VERIFIED_USER = {
  primaryEmailAddressId: 'email_1',
  emailAddresses: [
    { id: 'email_1', emailAddress: 'me@example.com', verification: { status: 'verified' } }
  ]
}

function fakeEvent(path: string, userId: string | null): H3Event {
  return {
    path,
    context: {
      auth: () => ({ userId })
    }
  } as unknown as H3Event
}

describe('auth middleware', () => {
  const originalAllowedEmails = process.env.ALLOWED_EMAILS

  beforeEach(() => {
    getUserMock.mockReset()
    useUserEmailCache().clear()
    process.env.ALLOWED_EMAILS = 'me@example.com'
  })

  afterEach(() => {
    if (originalAllowedEmails === undefined) delete process.env.ALLOWED_EMAILS
    else process.env.ALLOWED_EMAILS = originalAllowedEmails
  })

  it('skips /api/health entirely, even unauthenticated', async () => {
    const event = fakeEvent('/api/health', null)
    await expect(authMiddleware(event)).resolves.toBeUndefined()
    expect(getUserMock).not.toHaveBeenCalled()
  })

  it('skips non-API paths', async () => {
    const event = fakeEvent('/library', null)
    await expect(authMiddleware(event)).resolves.toBeUndefined()
  })

  it('401s an unauthenticated request to a protected API route', async () => {
    const event = fakeEvent('/api/me', null)
    await expect(authMiddleware(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(getUserMock).not.toHaveBeenCalled()
  })

  it('403s an authenticated user whose email is not allowlisted', async () => {
    getUserMock.mockResolvedValue(VERIFIED_USER)
    process.env.ALLOWED_EMAILS = 'someone-else@example.com'
    const event = fakeEvent('/api/me', 'user_1')
    await expect(authMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403s when ALLOWED_EMAILS is empty (fail closed)', async () => {
    getUserMock.mockResolvedValue(VERIFIED_USER)
    process.env.ALLOWED_EMAILS = ''
    const event = fakeEvent('/api/me', 'user_1')
    await expect(authMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403s an authenticated user whose primary email is unverified', async () => {
    getUserMock.mockResolvedValue({
      primaryEmailAddressId: 'email_1',
      emailAddresses: [
        { id: 'email_1', emailAddress: 'me@example.com', verification: { status: 'unverified' } }
      ]
    })
    const event = fakeEvent('/api/me', 'user_1')
    await expect(authMiddleware(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('sets event.context.userId and returns normally for an allowlisted, verified user', async () => {
    getUserMock.mockResolvedValue(VERIFIED_USER)
    const event = fakeEvent('/api/me', 'user_1')
    await expect(authMiddleware(event)).resolves.toBeUndefined()
    expect(event.context.userId).toBe('user_1')
  })

  it('caches the Clerk API lookup: a second request for the same user does not call getUser again', async () => {
    getUserMock.mockResolvedValue(VERIFIED_USER)
    await authMiddleware(fakeEvent('/api/me', 'user_1'))
    await authMiddleware(fakeEvent('/api/me', 'user_1'))
    expect(getUserMock).toHaveBeenCalledTimes(1)
  })

  it('never trusts a client-supplied email: only event.context.auth().userId is used to look up the user', async () => {
    getUserMock.mockResolvedValue(VERIFIED_USER)
    const event = {
      path: '/api/me',
      context: {
        auth: () => ({ userId: 'user_1' }),
        // A client could stuff arbitrary context/body data; the middleware
        // must never read an email from here.
        clientSuppliedEmail: 'someone-else@example.com'
      }
    } as unknown as H3Event
    await expect(authMiddleware(event)).resolves.toBeUndefined()
    expect(getUserMock).toHaveBeenCalledWith('user_1')
  })
})
