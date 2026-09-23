import type { DbContext } from '../db/client'
import { useDb } from '../utils/db'
import type { TagRepository } from './types'
import { createSqliteTagRepository } from './tag-repository.sqlite'
import { createPostgresTagRepository } from './tag-repository.postgres'

export type { TagRepository } from './types'

/**
 * Builds the `TagRepository` implementation for whichever dialect `ctx` is
 * on (ADR 0006). Defaults to the process-wide `useDb()` context; tests pass
 * their own isolated `ctx` instead.
 */
export async function createTagRepository(ctx?: DbContext): Promise<TagRepository> {
  const resolved = ctx ?? (await useDb())
  return resolved.dialect === 'postgres'
    ? createPostgresTagRepository(resolved)
    : createSqliteTagRepository(resolved)
}
