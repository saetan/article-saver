import type { DbContext } from '../db/client'
import type { ItemRepository } from './types'
import { createSqliteItemRepository } from './item-repository.sqlite'
import { createPostgresItemRepository } from './item-repository.postgres'

export type { ItemRepository, ItemListFilter } from './types'
export { DuplicateCanonicalUrlError } from './types'

/** Builds the `ItemRepository` implementation for whichever dialect `ctx` is on (ADR 0006). */
export function createItemRepository(ctx: DbContext): ItemRepository {
  return ctx.dialect === 'postgres'
    ? createPostgresItemRepository(ctx)
    : createSqliteItemRepository(ctx)
}
