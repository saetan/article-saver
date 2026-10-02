import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Item } from '../db/schema/types'
import { InvalidUrlError, safeFetch, type SafeFetchResponse } from '../fetch'
import { NonRetryableExtractionError } from '../jobs/extractor'
import { createArticleExtractor } from './article-extractor'

const fixture = (name: string) =>
  readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')

const item = (url: string) => ({ id: 'i1', url }) as Item

function response(body: string, init: Partial<SafeFetchResponse> = {}): SafeFetchResponse {
  return {
    status: 200,
    url: 'https://journal.example/posts/slow-web',
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: new TextEncoder().encode(body),
    text: () => body,
    ...init
  }
}

describe('createArticleExtractor', () => {
  it('fetches the item URL and returns extracted, sanitised content', async () => {
    const urls: string[] = []
    const extractor = createArticleExtractor({
      fetch: async (url) => {
        urls.push(url)
        return response(fixture('article.html'))
      }
    })
    const result = await extractor.extract(item('https://journal.example/posts/slow-web'))
    expect(urls).toEqual(['https://journal.example/posts/slow-web'])
    expect(result.title).toBe('The Slow Web')
    expect(result.wordCount).toBeGreaterThan(100)
  })

  it('uses safeFetch by default, so plain http is refused as non-retryable', async () => {
    await expect(createArticleExtractor().extract(item('http://example.com/a'))).rejects.toThrow(
      NonRetryableExtractionError
    )
    // Sanity: the guard it relies on is the real one.
    await expect(safeFetch('http://example.com/a')).rejects.toThrow(InvalidUrlError)
  })

  it('fails a JS-only shell with "no readable content", non-retryable', async () => {
    const extractor = createArticleExtractor({
      fetch: async () => response(fixture('js-shell.html'))
    })
    const err = await extractor.extract(item('https://a.test/x')).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(NonRetryableExtractionError)
    expect((err as Error).message).toBe('no readable content')
  })

  it('treats 4xx as permanent but 5xx and 429 as retryable', async () => {
    const run = (status: number) =>
      createArticleExtractor({ fetch: async () => response('', { status }) })
        .extract(item('https://a.test/x'))
        .catch((e: unknown) => e)
    expect(await run(404)).toBeInstanceOf(NonRetryableExtractionError)
    expect(await run(503)).not.toBeInstanceOf(NonRetryableExtractionError)
    expect(await run(429)).not.toBeInstanceOf(NonRetryableExtractionError)
  })

  it('rejects non-HTML content types', async () => {
    const extractor = createArticleExtractor({
      fetch: async () => response('%PDF', { headers: { 'content-type': 'application/pdf' } })
    })
    await expect(extractor.extract(item('https://a.test/x'))).rejects.toThrow(
      NonRetryableExtractionError
    )
  })
})
