import { describe, expect, it } from 'vitest'
import { isAuthPagePath } from './auth-routes'

describe('isAuthPagePath', () => {
  it.each([
    '/sign-in',
    '/sign-in/',
    '/sign-in/sso-callback',
    '/sign-in/factor-one',
    '/sign-up',
    '/sign-up/',
    '/sign-up/continue',
    '/sign-up/verify-email-address'
  ])('exempts %s', (path) => expect(isAuthPagePath(path)).toBe(true))

  it.each(['/', '/sign-inx', '/sign-up-foo', '/sign-in-x/a', '/x/sign-in', '/not-allowed'])(
    'does not exempt %s',
    (path) => expect(isAuthPagePath(path)).toBe(false)
  )
})
