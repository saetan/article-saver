import type { SqliteDbContext } from './sqlite-client'
import type { PostgresDbContext } from './postgres-client'

export type { SqliteDbContext } from './sqlite-client'
export type { PostgresDbContext } from './postgres-client'

export type Dialect = 'sqlite' | 'postgres'
export type DbContext = SqliteDbContext | PostgresDbContext

// Re-exported for direct use (e.g. test helpers) without going through
// `createDbContext`'s env-driven dialect selection.
export { createSqliteDbContext } from './sqlite-client'
export { createPostgresDbContext } from './postgres-client'

/**
 * Builds the db context selected by `DB_DIALECT` (ADR 0006). Reads
 * `SQLITE_PATH` / `DATABASE_URL` from the given environment (defaults to
 * `process.env`) so it can be exercised in tests without touching globals.
 *
 * Only the driver for the selected dialect is imported (dynamically), so a
 * Postgres-only deployment never has to load `@libsql/client`'s native
 * binary, and vice versa.
 */
export async function createDbContext(env: NodeJS.ProcessEnv = process.env): Promise<DbContext> {
  const dialect = env.DB_DIALECT ?? 'sqlite'

  if (dialect === 'postgres') {
    const { createPostgresDbContext } = await import('./postgres-client')
    const url =
      env.DATABASE_URL ?? 'postgres://article_saver:article_saver@localhost:5432/article_saver'
    return createPostgresDbContext(url)
  }

  if (dialect !== 'sqlite') {
    throw new Error(`Unknown DB_DIALECT "${dialect}"; expected "sqlite" or "postgres".`)
  }

  const { createSqliteDbContext } = await import('./sqlite-client')
  const path = env.SQLITE_PATH ?? './.data/article-saver.sqlite'
  return createSqliteDbContext(`file:${path}`)
}
