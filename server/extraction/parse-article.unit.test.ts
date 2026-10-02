import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NoReadableContentError, parseArticle } from './parse-article'

const fixture = (name: string) =>
  readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')

const PAGE_URL = 'https://journal.example/posts/slow-web'

describe('parseArticle', () => {
  it('extracts metadata and clean content from a normal article', () => {
    const r = parseArticle(fixture('article.html'), PAGE_URL)
    expect(r.title).toBe('The Slow Web')
    expect(r.author).toBe('Ada Lovelace')
    expect(r.siteName).toBe('Example Journal')
    expect(r.publishedAt?.toISOString()).toBe('2026-03-04T09:30:00.000Z')
    expect(r.excerpt).toBe('Why slower reading beats the feed.')
    expect(r.imageUrl).toBe('https://journal.example/img/lead.jpg')
    expect(r.contentText).toContain('Saving an article for later is an act of intent')
    expect(r.contentText).not.toContain('Copyright Example Journal')
    expect(r.wordCount).toBeGreaterThan(100)
    expect(r.contentHtml).toContain('<h2>')
    expect(r.contentHtml).toContain('https://journal.example/related/story')
    expect(r.contentHtml).toContain('https://other.example/page')
    expect(r.contentHtml).toContain('https://journal.example/img/inline.png')
  })

  it('throws "no readable content" for a JS-only shell', () => {
    expect(() => parseArticle(fixture('js-shell.html'), PAGE_URL)).toThrow(NoReadableContentError)
    expect(() => parseArticle(fixture('js-shell.html'), PAGE_URL)).toThrow('no readable content')
  })

  it('throws "no readable content" for empty input', () => {
    expect(() => parseArticle('', PAGE_URL)).toThrow('no readable content')
  })

  it('strips scripts, handlers, javascript:/data: URLs, iframes, forms and styles', () => {
    const r = parseArticle(fixture('malicious.html'), PAGE_URL)
    const html = r.contentHtml!
    expect(html).toContain('quick brown fox')
    expect(html).toContain('https://safe.example/ok')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<iframe/i)
    expect(html).not.toMatch(/<form/i)
    expect(html).not.toMatch(/<input/i)
    expect(html).not.toMatch(/<object/i)
    expect(html).not.toMatch(/<svg/i)
    expect(html).not.toMatch(/\son\w+\s*=/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/data:/i)
    expect(html).not.toMatch(/style\s*=/i)
    expect(r.contentText).not.toContain('__pwned')
  })

  it('does not keep unsafe schemes in the lead image', () => {
    const html = `<html><head><title>T</title>
      <meta property="og:image" content="javascript:alert(1)" /></head><body><article>${'<p>word </p>'.repeat(200)}</article></body></html>`
    expect(parseArticle(html, PAGE_URL).imageUrl).toBeNull()
  })
})
