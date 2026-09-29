import { describe, expect, it } from 'vitest'
import { canonicalizeUrl } from '../url/canonicalize'
import { detectItemType } from './item-type'

describe('detectItemType', () => {
  it.each([
    ['https://x.com/jack/status/20', 'x_post'],
    ['https://threads.net/@zuck/post/abc', 'threads_post'],
    ['https://instagram.com/p/abc', 'instagram_post'],
    ['https://example.com/post', 'article'],
    ['https://notx.com/a', 'article'],
    ['https://x.com.evil.example/a', 'article']
  ])('%s -> %s', (url, expected) => {
    expect(detectItemType(url)).toBe(expected)
  })

  it('detects aliases once canonicalised', () => {
    expect(detectItemType(canonicalizeUrl('https://twitter.com/jack/status/20'))).toBe('x_post')
    expect(detectItemType(canonicalizeUrl('http://www.instagram.com/p/abc/'))).toBe(
      'instagram_post'
    )
    expect(detectItemType(canonicalizeUrl('https://www.threads.net/@a/post/b'))).toBe(
      'threads_post'
    )
  })
})
