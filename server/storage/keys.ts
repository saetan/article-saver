import { InvalidBlobKeyError } from './errors'

/** Characters allowed in a single path segment of a blob key. */
const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/

/**
 * Validates a blob key, throwing {@link InvalidBlobKeyError} if it is unsafe
 * to use as a filesystem-relative or object-storage path: empty, absolute,
 * containing `..`, a NUL byte, a backslash, or an empty segment.
 */
export function assertValidBlobKey(key: string): void {
  if (key.length === 0) {
    throw new InvalidBlobKeyError(key, 'must not be empty')
  }
  if (key.includes('\0')) {
    throw new InvalidBlobKeyError(key, 'must not contain a NUL byte')
  }
  if (key.includes('\\')) {
    throw new InvalidBlobKeyError(key, 'must not contain a backslash')
  }
  if (key.startsWith('/')) {
    throw new InvalidBlobKeyError(key, 'must not be an absolute path')
  }
  if (/^[A-Za-z]:/.test(key)) {
    throw new InvalidBlobKeyError(key, 'must not be a drive-letter absolute path')
  }

  const segments = key.split('/')
  for (const segment of segments) {
    if (segment.startsWith('.')) {
      throw new InvalidBlobKeyError(key, 'segments must not start with "."')
    }
    if (!SEGMENT_PATTERN.test(segment)) {
      throw new InvalidBlobKeyError(
        key,
        'segments may only contain letters, digits, "." "_" and "-"'
      )
    }
  }

  const lastSegment = segments[segments.length - 1]
  if (lastSegment?.endsWith('.meta.json')) {
    throw new InvalidBlobKeyError(key, '".meta.json" is reserved for content-type sidecars')
  }
}

/** Characters allowed in a user id used to namespace blob keys. */
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

function assertValidUserId(userId: string): void {
  if (!USER_ID_PATTERN.test(userId)) {
    throw new InvalidBlobKeyError(
      userId,
      'userId must be 1-128 chars of letters, digits, "_" or "-"'
    )
  }
}

/**
 * Builds a `users/<userId>/...` blob key from path segments, validating the
 * userId and the resulting key.
 */
export function userBlobKey(userId: string, ...segments: string[]): string {
  assertValidUserId(userId)
  const key = ['users', userId, ...segments].join('/')
  assertValidBlobKey(key)
  return key
}
