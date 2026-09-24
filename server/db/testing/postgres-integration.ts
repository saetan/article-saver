import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { createPostgresDbContext } from '../postgres-client'
import type { PostgresDbContext } from '../postgres-client'
import { POSTGRES_CONFIG_PATH } from './config-path'

let cached: PostgresDbContext | undefined

function readConnectionString(): string {
  let raw: string
  try {
    raw = readFileSync(POSTGRES_CONFIG_PATH, 'utf8')
  } catch {
    throw new Error(
      'No Postgres integration container found. Run this suite via `pnpm test:integration:postgres` ' +
        '(TEST_DIALECT=postgres), which starts and migrates the container in globalSetup.'
    )
  }
  return (JSON.parse(raw) as { connectionString: string }).connectionString
}

// Truncated in FK-safe order (children before parents); CASCADE makes the
// order mostly belt-and-braces.
const TABLES = ['item_tags', 'jobs', 'items', 'tags']

/**
 * A `PostgresDbContext` backed by the Testcontainers Postgres started in
 * `postgres-container.ts`'s globalSetup. The connection is created once per
 * worker process and reused; every call truncates all tables first so each
 * test starts from an empty database (ADR 0012: contract suites run
 * "isolated" per test).
 */
export async function createIntegrationPostgresDbContext(): Promise<PostgresDbContext> {
  if (!cached) {
    cached = createPostgresDbContext(readConnectionString())
  }
  await cached.db.execute(sql.raw(`truncate table ${TABLES.join(', ')} restart identity cascade`))
  return cached
}
