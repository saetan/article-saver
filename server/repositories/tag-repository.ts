import type { DbContext } from '../db/client'
import type { TagRepository } from './types'
import { createSqliteTagRepository } from './tag-repository.sqlite'
import { createPostgresTagRepository } from './tag-repository.postgres'

export type { TagRepository } from './types'

/** Builds the `TagRepository` implementation for whichever dialect `ctx` is on (ADR 0006). */
export function createTagRepository(ctx: DbContext): TagRepository {
  return ctx.dialect === 'postgres'
    ? createPostgresTagRepository(ctx)
    : createSqliteTagRepository(ctx)
}
