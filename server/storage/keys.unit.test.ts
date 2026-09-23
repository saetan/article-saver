import { describe, expect, it } from 'vitest'
import { InvalidBlobKeyError } from './errors'
import { assertValidBlobKey, userBlobKey } from './keys'

describe('assertValidBlobKey', () => {
  it('accepts a simple namespaced key', () => {
    expect(() => assertValidBlobKey('users/u1/item-1/original.pdf')).not.toThrow()
  })

  it('rejects an empty key', () => {
    expect(() => assertValidBlobKey('')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key containing a .. segment', () => {
    expect(() => assertValidBlobKey('users/u1/../u2/secret.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key that is exactly ..', () => {
    expect(() => assertValidBlobKey('..')).toThrow(InvalidBlobKeyError)
  })

  it('rejects an absolute path', () => {
    expect(() => assertValidBlobKey('/etc/passwd')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a Windows-style absolute path', () => {
    expect(() => assertValidBlobKey('C:\\Windows\\system.ini')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key containing a NUL byte', () => {
    expect(() => assertValidBlobKey('users/u1/a\0.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key containing a backslash', () => {
    expect(() => assertValidBlobKey('users\\u1\\a.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key with an empty segment', () => {
    expect(() => assertValidBlobKey('users//a.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a key whose last segment ends in .meta.json (reserved for sidecars)', () => {
    expect(() => assertValidBlobKey('users/u1/x.meta.json')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a segment starting with a dot', () => {
    expect(() => assertValidBlobKey('users/u1/.hidden')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a leading dot segment even mid-key', () => {
    expect(() => assertValidBlobKey('.config/users/u1/a.pdf')).toThrow(InvalidBlobKeyError)
  })
})

describe('userBlobKey', () => {
  it('builds a users/<userId>/... key from path segments', () => {
    expect(userBlobKey('u1', 'item-1', 'original.pdf')).toBe('users/u1/item-1/original.pdf')
  })

  it('rejects an empty userId', () => {
    expect(() => userBlobKey('', 'a.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a userId containing a slash', () => {
    expect(() => userBlobKey('u1/../u2', 'a.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('rejects a userId containing path traversal', () => {
    expect(() => userBlobKey('..', 'a.pdf')).toThrow(InvalidBlobKeyError)
  })

  it('produces a key that itself passes assertValidBlobKey', () => {
    expect(() => assertValidBlobKey(userBlobKey('u1', 'nested', 'file.pdf'))).not.toThrow()
  })
})
