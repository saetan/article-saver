import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { requireUserId } from './require-user-id'

function fakeEvent(userId?: string): H3Event {
  return { context: { userId } } as unknown as H3Event
}

describe('requireUserId', () => {
  it('returns the userId set by the auth middleware', () => {
    expect(requireUserId(fakeEvent('user_1'))).toBe('user_1')
  })

  it('throws a 401 when userId is missing', () => {
    expect(() => requireUserId(fakeEvent(undefined))).toThrowError(
      expect.objectContaining({ statusCode: 401 })
    )
  })
})
