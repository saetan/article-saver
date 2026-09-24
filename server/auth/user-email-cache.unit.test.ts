import { describe, expect, it } from 'vitest'
import { UserEmailCache } from './user-email-cache'

describe('UserEmailCache', () => {
  it('returns undefined for a userId that has never been set', () => {
    const cache = new UserEmailCache()
    expect(cache.get('user_1')).toBeUndefined()
  })

  it('returns the cached email within the TTL', () => {
    const cache = new UserEmailCache(1000)
    cache.set('user_1', 'me@example.com', 0)
    expect(cache.get('user_1', 500)).toBe('me@example.com')
  })

  it('caches a null result (verified-email-less user) too', () => {
    const cache = new UserEmailCache(1000)
    cache.set('user_1', null, 0)
    expect(cache.get('user_1', 500)).toBeNull()
  })

  it('expires and returns undefined once the TTL has elapsed', () => {
    const cache = new UserEmailCache(1000)
    cache.set('user_1', 'me@example.com', 0)
    expect(cache.get('user_1', 1000)).toBeUndefined()
  })

  it('keeps separate entries per user', () => {
    const cache = new UserEmailCache(1000)
    cache.set('user_1', 'a@example.com', 0)
    cache.set('user_2', 'b@example.com', 0)
    expect(cache.get('user_1', 0)).toBe('a@example.com')
    expect(cache.get('user_2', 0)).toBe('b@example.com')
  })

  it('clear() removes all entries', () => {
    const cache = new UserEmailCache(1000)
    cache.set('user_1', 'a@example.com', 0)
    cache.clear()
    expect(cache.get('user_1', 0)).toBeUndefined()
  })
})
