/**
 * Dialect-agnostic domain types shared by both the SQLite and Postgres
 * schemas (ADR 0006) and by the repository layer. These are the shapes app
 * code actually works with — never Drizzle's inferred row types directly.
 */

export const ITEM_TYPES = ['article', 'pdf', 'x_post', 'threads_post', 'instagram_post'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const ITEM_STATUSES = ['unread', 'read', 'archived'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const EXTRACTION_STATUSES = ['pending', 'succeeded', 'failed', 'not_applicable'] as const
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number]

export const JOB_STATUSES = ['pending', 'running', 'succeeded', 'failed'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** Free-form, type-specific extras (ADR 0013), e.g. tweet id/handle, PDF page count + blob key. */
export type ItemMetadata = Record<string, unknown>

export interface Item {
  id: string
  userId: string
  type: ItemType
  url: string
  /** Normalised URL used for dedup (ADR 0013). Null for items without a meaningful URL (e.g. PDFs). */
  canonicalUrl: string | null
  title: string | null
  excerpt: string | null
  contentHtml: string | null
  contentText: string | null
  pastedText: string | null
  author: string | null
  publishedAt: Date | null
  siteName: string | null
  imageUrl: string | null
  status: ItemStatus
  isFavorite: boolean
  notes: string | null
  wordCount: number | null
  extractionStatus: ExtractionStatus
  extractionError: string | null
  metadata: ItemMetadata | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Fields the caller supplies when creating an Item; the rest are
 * defaulted/generated. `userId` is not here: every repository method takes
 * it as an explicit argument (ADR 0002), not as part of the payload.
 */
export interface NewItem {
  type: ItemType
  url: string
  canonicalUrl?: string | null
  title?: string | null
  excerpt?: string | null
  contentHtml?: string | null
  contentText?: string | null
  pastedText?: string | null
  author?: string | null
  publishedAt?: Date | null
  siteName?: string | null
  imageUrl?: string | null
  status?: ItemStatus
  isFavorite?: boolean
  notes?: string | null
  wordCount?: number | null
  extractionStatus?: ExtractionStatus
  extractionError?: string | null
  metadata?: ItemMetadata | null
}

/** Partial update; id/userId/createdAt are immutable via this type. */
export type ItemUpdate = Partial<NewItem & { updatedAt: Date }>

export interface Tag {
  id: string
  userId: string
  name: string
  createdAt: Date
}

export interface NewTag {
  name: string
}

export interface Job {
  id: string
  userId: string
  itemId: string
  type: string
  status: JobStatus
  attempts: number
  error: string | null
  runAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NewJob {
  itemId: string
  type: string
  status?: JobStatus
  attempts?: number
  error?: string | null
  runAt?: Date | null
}

export type JobUpdate = Partial<
  Pick<Job, 'status' | 'attempts' | 'error' | 'runAt'> & { updatedAt: Date }
>
