import type { DbContext } from '../client'

/**
 * Builds the db context for the integration suite, selected by
 * `TEST_DIALECT` (defaults to `sqlite`). The repository `*.integration.test.ts`
 * files call this so the same contract suite runs against both dialects
 * (#4 / ADR 0012), with the dialect picked by the CI matrix / local script
 * rather than hard-coded in the test file.
 *
 * Only the selected dialect's helper (and driver) is imported, dynamically
 * -- same reasoning as `../client.ts`'s `createDbContext`: a sqlite-only run
 * never pulls in `@testcontainers/postgresql` / `postgres`, and vice versa.
 */
export async function createIntegrationDbContext(): Promise<DbContext> {
  const dialect = process.env.TEST_DIALECT ?? 'sqlite'

  if (dialect === 'postgres') {
    const { createIntegrationPostgresDbContext } = await import('./postgres-integration')
    return createIntegrationPostgresDbContext()
  }

  if (dialect === 'sqlite') {
    const { createIntegrationSqliteDbContext } = await import('./sqlite-integration')
    return createIntegrationSqliteDbContext()
  }

  throw new Error(`Unknown TEST_DIALECT "${dialect}"; expected "sqlite" or "postgres".`)
}
