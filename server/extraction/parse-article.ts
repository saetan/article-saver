import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import type { ExtractionResult } from '../jobs/extractor'
import { safeUrl, sanitizeArticleHtml } from './sanitize-html'

export const NO_READABLE_CONTENT_MESSAGE = 'no readable content'

/** Fewer words than this and the page is treated as having no readable content. */
export const MIN_WORD_COUNT = 50

export class NoReadableContentError extends Error {
  constructor() {
    super(NO_READABLE_CONTENT_MESSAGE)
    this.name = 'NoReadableContentError'
  }
}

type Doc = ReturnType<typeof parseHTML>['document']

function clean(value: string | null | undefined, max = 1000): string | null {
  const v = value?.replace(/\s+/g, ' ').trim()
  return v ? v.slice(0, max) : null
}

function meta(document: Doc, ...keys: string[]): string | null {
  for (const key of keys) {
    for (const el of document.querySelectorAll('meta')) {
      const name = (el.getAttribute('property') ?? el.getAttribute('name') ?? '').toLowerCase()
      if (name === key) {
        const content = clean(el.getAttribute('content'))
        if (content) return content
      }
    }
  }
  return null
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Parses a fetched HTML page into a sanitised article (pure: no network).
 * Throws {@link NoReadableContentError} when nothing substantial is found,
 * e.g. a JS-only shell.
 */
export function parseArticle(html: string, pageUrl: string): ExtractionResult {
  if (!html.trim()) throw new NoReadableContentError()

  const { document } = parseHTML(html)

  // Metadata is read before Readability, which mutates the document.
  const metaTitle = meta(document, 'og:title', 'twitter:title')
  const metaAuthor = meta(document, 'author', 'article:author', 'og:article:author')
  const metaSite = meta(document, 'og:site_name', 'application-name')
  const metaPublished = parseDate(
    meta(document, 'article:published_time', 'og:article:published_time', 'date', 'pubdate')
  )
  const metaDescription = meta(document, 'og:description', 'description', 'twitter:description')
  const rawImage = meta(document, 'og:image', 'twitter:image')

  const article = new Readability(document as unknown as Document).parse()
  if (!article?.content) throw new NoReadableContentError()

  const contentHtml = sanitizeArticleHtml(article.content, pageUrl)
  // Derive text from the sanitised HTML so text and HTML can never disagree.
  const contentText = clean(
    parseHTML(`<!doctype html><html><body>${contentHtml}</body></html>`).document.body.textContent,
    10_000_000
  )
  const wordCount = contentText ? countWords(contentText) : 0
  if (!contentText || wordCount < MIN_WORD_COUNT) throw new NoReadableContentError()

  return {
    title: metaTitle ?? clean(article.title, 500),
    author: metaAuthor ?? clean(article.byline, 200),
    siteName: metaSite ?? clean(article.siteName, 200),
    publishedAt: metaPublished ?? parseDate(article.publishedTime ?? null),
    excerpt: metaDescription ?? clean(article.excerpt, 500),
    imageUrl: rawImage ? safeUrl(rawImage, pageUrl) : null,
    contentHtml,
    contentText,
    wordCount
  }
}
