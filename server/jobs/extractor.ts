import type { Item, ItemMetadata, ItemType } from '../db/schema/types'

/** Content an {@link Extractor} produces; merged into the Item on success. */
export interface ExtractionResult {
  title?: string | null
  excerpt?: string | null
  contentHtml?: string | null
  contentText?: string | null
  author?: string | null
  publishedAt?: Date | null
  siteName?: string | null
  imageUrl?: string | null
  wordCount?: number | null
  metadata?: ItemMetadata | null
}

/**
 * Turns a saved Item's URL into stored content (CONTEXT.md: Extractor). Real
 * implementations arrive in #13 (articles), #16 (PDFs) and #17 (social
 * posts). Any network access an extractor does MUST go through
 * `server/fetch`'s `safeFetch` (ADR 0008).
 *
 * Throw {@link NonRetryableExtractionError} for failures a retry cannot fix;
 * any other error is retried with backoff up to the max attempts.
 */
export interface Extractor {
  extract(item: Item): Promise<ExtractionResult>
}

/** A failure that retrying cannot fix (e.g. unsupported type, permanent 4xx). */
export class NonRetryableExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableExtractionError'
  }
}

export const EXTRACTION_NOT_AVAILABLE_MESSAGE = 'Extraction not available yet'

/** Extractors keyed by Item type. */
export type ExtractorRegistry = Partial<Record<ItemType, Extractor>>

/**
 * Empty registry: every type fails fast with
 * {@link EXTRACTION_NOT_AVAILABLE_MESSAGE}, without retries. The app's real
 * registry is assembled in `server/plugins/jobs-worker.ts` (the article
 * extractor lives in `server/extraction`, which imports this module).
 */
export const defaultExtractors: ExtractorRegistry = {}

export function resolveExtractor(registry: ExtractorRegistry, type: ItemType): Extractor {
  const extractor = registry[type]
  if (!extractor) throw new NonRetryableExtractionError(EXTRACTION_NOT_AVAILABLE_MESSAGE)
  return extractor
}
