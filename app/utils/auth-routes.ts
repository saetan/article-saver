/**
 * True for Clerk's path-routed auth pages: `/sign-in`, `/sign-up` and any
 * sub-path (`/sign-in/sso-callback`, `/sign-up/continue`, ...). Lookalikes
 * such as `/sign-inx` do not match.
 */
export function isAuthPagePath(path: string): boolean {
  return /^\/sign-(in|up)(\/.*)?$/.test(path)
}
