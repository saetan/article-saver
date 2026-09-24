import { describe, expect, it } from 'vitest'
import { resolvePrimaryVerifiedEmail, type ClerkUserLike } from './user-email'

function user(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    primaryEmailAddressId: 'email_1',
    emailAddresses: [
      { id: 'email_1', emailAddress: 'me@example.com', verification: { status: 'verified' } }
    ],
    ...overrides
  }
}

describe('resolvePrimaryVerifiedEmail', () => {
  it('returns the primary email when it is verified', () => {
    expect(resolvePrimaryVerifiedEmail(user())).toBe('me@example.com')
  })

  it('returns null when the primary email is unverified', () => {
    const input = user({
      emailAddresses: [
        { id: 'email_1', emailAddress: 'me@example.com', verification: { status: 'unverified' } }
      ]
    })
    expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
  })

  it('returns null when the primary email has no verification record', () => {
    const input = user({
      emailAddresses: [{ id: 'email_1', emailAddress: 'me@example.com', verification: null }]
    })
    expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
  })

  it('returns null when primaryEmailAddressId is null', () => {
    const input = user({ primaryEmailAddressId: null })
    expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
  })

  it('returns null when primaryEmailAddressId does not match any email', () => {
    const input = user({ primaryEmailAddressId: 'email_missing' })
    expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
  })

  it('ignores a verified non-primary email', () => {
    const input = user({
      primaryEmailAddressId: 'email_1',
      emailAddresses: [
        { id: 'email_1', emailAddress: 'unverified@example.com', verification: null },
        {
          id: 'email_2',
          emailAddress: 'verified@example.com',
          verification: { status: 'verified' }
        }
      ]
    })
    expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
  })

  it('returns null for a transferable/failed/expired verification status', () => {
    for (const status of ['transferable', 'failed', 'expired']) {
      const input = user({
        emailAddresses: [
          { id: 'email_1', emailAddress: 'me@example.com', verification: { status } }
        ]
      })
      expect(resolvePrimaryVerifiedEmail(input)).toBeNull()
    }
  })
})
