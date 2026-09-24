import { describe, expect, it } from 'vitest'
import { canonicalizeUrl } from './canonicalize'
import { InvalidCanonicalUrlError } from './errors'

describe('canonicalizeUrl', () => {
  it('lower-cases the scheme and host', () => {
    expect(canonicalizeUrl('HTTPS://Example.COM/Post')).toBe('https://example.com/Post')
  })

  it('leaves the path case untouched', () => {
    expect(canonicalizeUrl('https://example.com/Some/Path')).toBe('https://example.com/Some/Path')
  })

  it('drops the fragment', () => {
    expect(canonicalizeUrl('https://example.com/post#section-2')).toBe('https://example.com/post')
  })

  it('trims a trailing slash on a non-root path', () => {
    expect(canonicalizeUrl('https://example.com/post/')).toBe('https://example.com/post')
  })

  it('keeps the root path as a single slash', () => {
    expect(canonicalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('keeps a bare host without a path as-is', () => {
    expect(canonicalizeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('removes the default https port', () => {
    expect(canonicalizeUrl('https://example.com:443/post')).toBe('https://example.com/post')
  })

  it('removes the default http port', () => {
    expect(canonicalizeUrl('http://example.com:80/post')).toBe('https://example.com/post')
  })

  it('keeps a non-default port', () => {
    expect(canonicalizeUrl('https://example.com:8443/post')).toBe('https://example.com:8443/post')
  })

  describe('scheme', () => {
    it('accepts http and normalises it to https', () => {
      expect(canonicalizeUrl('http://example.com/post')).toBe('https://example.com/post')
    })

    it('treats http and https versions of the same page as identical', () => {
      expect(canonicalizeUrl('http://example.com/post')).toBe(
        canonicalizeUrl('https://example.com/post')
      )
    })

    it('keeps a port that is not the default for the original scheme, even once normalised to https', () => {
      // 443 is not http's default port (80 is), so it is not dropped even
      // though the output scheme becomes https.
      expect(canonicalizeUrl('http://example.com:443/post')).toBe('https://example.com:443/post')
    })

    it('drops the default http port even though the output scheme is https', () => {
      expect(canonicalizeUrl('http://example.com:80/post')).toBe('https://example.com/post')
    })

    it('rejects javascript: URLs', () => {
      expect(() => canonicalizeUrl('javascript:alert(1)')).toThrow(InvalidCanonicalUrlError)
    })

    it('rejects mailto: URLs', () => {
      expect(() => canonicalizeUrl('mailto:someone@example.com')).toThrow(InvalidCanonicalUrlError)
    })

    it('rejects ftp: URLs', () => {
      expect(() => canonicalizeUrl('ftp://example.com/file')).toThrow(InvalidCanonicalUrlError)
    })

    it('rejects data: URLs', () => {
      expect(() => canonicalizeUrl('data:text/plain,hello')).toThrow(InvalidCanonicalUrlError)
    })
  })

  describe('trailing-dot hosts', () => {
    it('strips a single trailing dot from the host', () => {
      expect(canonicalizeUrl('https://example.com./post')).toBe('https://example.com/post')
    })

    it('applies host aliasing after stripping the trailing dot', () => {
      expect(canonicalizeUrl('https://twitter.com./user/status/1')).toBe(
        'https://x.com/user/status/1'
      )
    })
  })

  describe('tracking params', () => {
    it('strips utm_* params', () => {
      expect(
        canonicalizeUrl('https://example.com/post?utm_source=newsletter&utm_medium=email')
      ).toBe('https://example.com/post')
    })

    it('strips fbclid, gclid, si, igsh, igshid, mc_cid, mc_eid, ref_src and ref_url', () => {
      const tracked = [
        'fbclid=1',
        'gclid=2',
        'si=3',
        'igsh=4',
        'igshid=5',
        'mc_cid=6',
        'mc_eid=7',
        'ref_src=8',
        'ref_url=9'
      ].join('&')
      expect(canonicalizeUrl(`https://example.com/post?${tracked}`)).toBe(
        'https://example.com/post'
      )
    })

    it('strips s and t on x.com share links', () => {
      expect(canonicalizeUrl('https://x.com/user/status/1?s=20&t=abc')).toBe(
        'https://x.com/user/status/1'
      )
    })

    it('keeps s and t on hosts other than x.com', () => {
      expect(canonicalizeUrl('https://example.com/search?s=20&t=abc')).toBe(
        'https://example.com/search?s=20&t=abc'
      )
    })

    it('keeps functional params such as v on a video watch URL', () => {
      expect(canonicalizeUrl('https://example.com/watch?v=abc123&utm_source=x')).toBe(
        'https://example.com/watch?v=abc123'
      )
    })

    it('sorts remaining query params by key for stability', () => {
      expect(canonicalizeUrl('https://example.com/post?b=2&a=1')).toBe(
        'https://example.com/post?a=1&b=2'
      )
    })

    it('drops the ? entirely when no query params remain', () => {
      expect(canonicalizeUrl('https://example.com/post?utm_source=x')).toBe(
        'https://example.com/post'
      )
    })
  })

  describe('social host normalisation', () => {
    it('maps twitter.com to x.com', () => {
      expect(canonicalizeUrl('https://twitter.com/user/status/1')).toBe(
        'https://x.com/user/status/1'
      )
    })

    it('maps mobile.twitter.com to x.com', () => {
      expect(canonicalizeUrl('https://mobile.twitter.com/user/status/1')).toBe(
        'https://x.com/user/status/1'
      )
    })

    it('maps www.twitter.com to x.com', () => {
      expect(canonicalizeUrl('https://www.twitter.com/user/status/1')).toBe(
        'https://x.com/user/status/1'
      )
    })

    it('maps www.x.com to x.com', () => {
      expect(canonicalizeUrl('https://www.x.com/user/status/1')).toBe('https://x.com/user/status/1')
    })

    it('maps www.threads.net to threads.net', () => {
      expect(canonicalizeUrl('https://www.threads.net/@user/post/1')).toBe(
        'https://threads.net/@user/post/1'
      )
    })

    it('maps www.instagram.com to instagram.com', () => {
      expect(canonicalizeUrl('https://www.instagram.com/p/abc123')).toBe(
        'https://instagram.com/p/abc123'
      )
    })

    it('leaves unrelated www. hosts untouched', () => {
      expect(canonicalizeUrl('https://www.example.com/post')).toBe('https://www.example.com/post')
    })
  })

  describe('invalid input', () => {
    it('throws InvalidCanonicalUrlError for an unparsable string', () => {
      expect(() => canonicalizeUrl('not a url')).toThrow(InvalidCanonicalUrlError)
    })

    it('throws InvalidCanonicalUrlError for an empty string', () => {
      expect(() => canonicalizeUrl('')).toThrow(InvalidCanonicalUrlError)
    })
  })

  it('composes host normalisation, tracking strip and trailing slash trim together', () => {
    expect(canonicalizeUrl('https://TWITTER.com/user/status/1/?s=20&utm_source=share#reply')).toBe(
      'https://x.com/user/status/1'
    )
  })
})
