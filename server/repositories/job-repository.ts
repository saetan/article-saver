import type { DbContext } from '../db/client'
import { useDb } from '../utils/db'
import type { JobRepository } from './types'
import { createSqliteJobRepository } from './job-repository.sqlite'
import { createPostgresJobRepository } from './job-repository.postgres'

export type { JobRepository } from './types'

/**
 * Builds the `JobRepository` implementation for whichever dialect `ctx` is
 * on (ADR 0006). Defaults to the process-wide `useDb()` context; tests pass
 * their own isolated `ctx` instead.
 */
export async function createJobRepository(ctx?: DbContext): Promise<JobRepository> {
  const resolved = ctx ?? (await useDb())
  return resolved.dialect === 'postgres'
    ? createPostgresJobRepository(resolved)
    : createSqliteJobRepository(resolved)
}
