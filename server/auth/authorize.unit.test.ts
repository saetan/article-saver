import { describe, expect, it } from 'vitest'
import { authorizeRequest } from './authorize'

const ALLOWLIST = ['me@example.com', 'other@example.com']

describe('authorizeRequest', () => {
  it('401s when there is no userId', () => {
    expect(
      authorizeRequest({
        userId: null,
        primaryVerifiedEmail: 'me@example.com',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: false, status: 401 })
  })

  it('401s when userId is undefined', () => {
    expect(
      authorizeRequest({
        userId: undefined,
        primaryVerifiedEmail: 'me@example.com',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: false, status: 401 })
  })

  it('401s when userId is an empty string', () => {
    expect(
      authorizeRequest({ userId: '', primaryVerifiedEmail: 'me@example.com', allowlist: ALLOWLIST })
    ).toEqual({ authorized: false, status: 401 })
  })

  it('200s when authenticated and the verified primary email is allowlisted', () => {
    expect(
      authorizeRequest({
        userId: 'user_1',
        primaryVerifiedEmail: 'me@example.com',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: true, userId: 'user_1' })
  })

  it('403s when authenticated but the email is not allowlisted', () => {
    expect(
      authorizeRequest({
        userId: 'user_1',
        primaryVerifiedEmail: 'stranger@example.com',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: false, status: 403 })
  })

  it('403s when authenticated but there is no verified email at all', () => {
    expect(
      authorizeRequest({ userId: 'user_1', primaryVerifiedEmail: null, allowlist: ALLOWLIST })
    ).toEqual({ authorized: false, status: 403 })
  })

  it('403s when the email is undefined (e.g. lookup failed)', () => {
    expect(
      authorizeRequest({ userId: 'user_1', primaryVerifiedEmail: undefined, allowlist: ALLOWLIST })
    ).toEqual({ authorized: false, status: 403 })
  })

  it('matches case-insensitively', () => {
    expect(
      authorizeRequest({
        userId: 'user_1',
        primaryVerifiedEmail: 'ME@EXAMPLE.COM',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: true, userId: 'user_1' })
  })

  it('matches after trimming stray whitespace on the email', () => {
    expect(
      authorizeRequest({
        userId: 'user_1',
        primaryVerifiedEmail: '  me@example.com  ',
        allowlist: ALLOWLIST
      })
    ).toEqual({ authorized: true, userId: 'user_1' })
  })

  it('fails closed: an empty allowlist authorizes nobody, even with a verified email', () => {
    expect(
      authorizeRequest({ userId: 'user_1', primaryVerifiedEmail: 'me@example.com', allowlist: [] })
    ).toEqual({ authorized: false, status: 403 })
  })

  it('fails closed before checking the email: unauthenticated + empty allowlist is still 401', () => {
    expect(authorizeRequest({ userId: null, primaryVerifiedEmail: null, allowlist: [] })).toEqual({
      authorized: false,
      status: 401
    })
  })
})
