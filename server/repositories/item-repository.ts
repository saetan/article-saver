import type { DbContext } from '../db/client'
import { useDb } from '../utils/db'
import type { ItemRepository } from './types'
import { createSqliteItemRepository } from './item-repository.sqlite'
import { createPostgresItemRepository } from './item-repository.postgres'

export type { ItemRepository, ItemListFilter } from './types'
export { DuplicateCanonicalUrlError } from './types'

/**
 * Builds the `ItemRepository` implementation for whichever dialect `ctx` is
 * on (ADR 0006). Defaults to the process-wide `useDb()` context; tests pass
 * their own isolated `ctx` instead.
 */
export async function createItemRepository(ctx?: DbContext): Promise<ItemRepository> {
  const resolved = ctx ?? (await useDb())
  return resolved.dialect === 'postgres'
    ? createPostgresItemRepository(resolved)
    : createSqliteItemRepository(resolved)
}
