import { inject } from 'vitest'
import { sql } from 'drizzle-orm'
import { createPostgresDbContext } from '../postgres-client'
import type { PostgresDbContext } from '../postgres-client'
// `./provided-context.d.ts` augments Vitest's ProvidedContext type; it has
// no runtime output, so it's picked up by the TS program (tsconfig's
// `include`) rather than imported here.

let cached: PostgresDbContext | undefined

function readConnectionString(): string {
  const connectionString = inject('postgresConnectionString')
  if (!connectionString) {
    throw new Error(
      'No Postgres integration container found. Run this suite via `pnpm test:integration:postgres` ' +
        '(TEST_DIALECT=postgres), which starts and migrates the container, and provides its connection ' +
        'string to tests, in globalSetup (see postgres-container.ts).'
    )
  }
  return connectionString
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
