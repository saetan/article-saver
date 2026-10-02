import { BlockedUrlError, InvalidUrlError, TooLargeError, safeFetch } from '../fetch'
import type { SafeFetchOptions, SafeFetchResponse } from '../fetch'
import { NonRetryableExtractionError, type Extractor } from '../jobs/extractor'
import { NoReadableContentError, parseArticle } from './parse-article'

type FetchFn = (url: string, opts?: SafeFetchOptions) => Promise<SafeFetchResponse>

export interface ArticleExtractorOptions {
  /** Defaults to the SSRF-guarded `safeFetch`. Never inject a raw fetch. */
  fetch?: FetchFn
  fetchOptions?: SafeFetchOptions
}

function headerOf(res: SafeFetchResponse, name: string): string {
  const v = res.headers[name]
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

/**
 * ArticleExtractor: `safeFetch` -> `linkedom` -> `@mozilla/readability` ->
 * DOMPurify (ADR 0008). Failures a retry cannot fix (plain http, blocked
 * host, 4xx, non-HTML, too large, no readable content) are non-retryable.
 */
export function createArticleExtractor(options: ArticleExtractorOptions = {}): Extractor {
  const fetchPage = options.fetch ?? safeFetch
  return {
    async extract(item) {
      let res: SafeFetchResponse
      try {
        res = await fetchPage(item.url, {
          ...options.fetchOptions,
          headers: { accept: 'text/html,application/xhtml+xml', ...options.fetchOptions?.headers }
        })
      } catch (error) {
        if (
          error instanceof InvalidUrlError ||
          error instanceof BlockedUrlError ||
          error instanceof TooLargeError
        ) {
          throw new NonRetryableExtractionError(error.message)
        }
        throw error
      }

      if (res.status >= 400) {
        const message = `Fetch failed with HTTP ${res.status}`
        if (res.status < 500 && res.status !== 408 && res.status !== 429) {
          throw new NonRetryableExtractionError(message)
        }
        throw new Error(message)
      }

      const contentType = headerOf(res, 'content-type').toLowerCase()
      if (contentType && !/\b(text\/html|application\/xhtml\+xml)\b/.test(contentType)) {
        throw new NonRetryableExtractionError(`Unsupported content type "${contentType}"`)
      }

      try {
        return parseArticle(res.text(), res.url || item.url)
      } catch (error) {
        if (error instanceof NoReadableContentError) {
          throw new NonRetryableExtractionError(error.message)
        }
        throw error
      }
    }
  }
}
