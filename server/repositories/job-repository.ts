import type { DbContext } from '../db/client'
import type { JobRepository } from './types'
import { createSqliteJobRepository } from './job-repository.sqlite'
import { createPostgresJobRepository } from './job-repository.postgres'

export type { JobRepository } from './types'

/** Builds the `JobRepository` implementation for whichever dialect `ctx` is on (ADR 0006). */
export function createJobRepository(ctx: DbContext): JobRepository {
  return ctx.dialect === 'postgres'
    ? createPostgresJobRepository(ctx)
    : createSqliteJobRepository(ctx)
}
