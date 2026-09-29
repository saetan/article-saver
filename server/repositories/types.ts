import type {
  Item,
  ItemUpdate,
  Job,
  JobUpdate,
  NewItem,
  NewJob,
  NewTag,
  Tag
} from '../db/schema/types'

/**
 * Thrown when creating/updating an Item would violate the
 * `(user_id, canonical_url)` unique index (ADR 0013). Callers (e.g. the
 * capture API route) catch this and respond `409 Conflict` with the
 * existing item's id.
 */
export class DuplicateCanonicalUrlError extends Error {
  readonly existingItemId?: string

  constructor(canonicalUrl: string, existingItemId?: string) {
    super(`An item with canonical URL "${canonicalUrl}" already exists for this user.`)
    this.name = 'DuplicateCanonicalUrlError'
    this.existingItemId = existingItemId
  }
}

export interface ItemListFilter {
  type?: Item['type']
  status?: Item['status']
  isFavorite?: boolean
  /** Maximum rows to return. Results are always newest first (`created_at` desc). */
  limit?: number
}

/**
 * Every method is scoped by `userId` (ADR 0002): a caller can only ever see
 * or mutate their own items, no matter what id is passed.
 */
export interface ItemRepository {
  create(userId: string, input: NewItem): Promise<Item>
  findById(userId: string, id: string): Promise<Item | null>
  findByCanonicalUrl(userId: string, canonicalUrl: string): Promise<Item | null>
  list(userId: string, filter?: ItemListFilter): Promise<Item[]>
  update(userId: string, id: string, input: ItemUpdate): Promise<Item | null>
  delete(userId: string, id: string): Promise<boolean>
}

export interface TagRepository {
  create(userId: string, input: NewTag): Promise<Tag>
  findById(userId: string, id: string): Promise<Tag | null>
  list(userId: string): Promise<Tag[]>
  delete(userId: string, id: string): Promise<boolean>
}

export interface JobRepository {
  create(userId: string, input: NewJob): Promise<Job>
  findById(userId: string, id: string): Promise<Job | null>
  listPending(userId: string): Promise<Job[]>
  /**
   * Atomically claims the oldest runnable job (`status = 'pending'` and
   * `run_at` null or <= `now`): flips it to `running`, increments
   * `attempts`, and returns it, or returns `null` when nothing is runnable.
   * Safe under concurrent workers on both dialects (Postgres `FOR UPDATE
   * SKIP LOCKED`; SQLite's single writer): no two callers ever receive the
   * same job.
   *
   * Deliberately NOT user-scoped: the background worker serves every user
   * (ADR 0002 scopes request handlers, not the system worker). The returned
   * job carries `userId`; everything the worker does next goes through the
   * user-scoped methods with that id.
   */
  claimNext(now: Date): Promise<Job | null>
  update(userId: string, id: string, input: JobUpdate): Promise<Job | null>
  delete(userId: string, id: string): Promise<boolean>
}
