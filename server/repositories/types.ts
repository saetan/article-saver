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
  update(userId: string, id: string, input: JobUpdate): Promise<Job | null>
  delete(userId: string, id: string): Promise<boolean>
}
