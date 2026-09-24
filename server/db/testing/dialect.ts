import type { DbContext } from '../client'
import { createIntegrationSqliteDbContext } from './sqlite-integration'
import { createIntegrationPostgresDbContext } from './postgres-integration'

/**
 * Builds the db context for the integration suite, selected by
 * `TEST_DIALECT` (defaults to `sqlite`). The repository `*.integration.test.ts`
 * files call this so the same contract suite runs against both dialects
 * (#4 / ADR 0012), with the dialect picked by the CI matrix / local script
 * rather than hard-coded in the test file.
 */
export async function createIntegrationDbContext(): Promise<DbContext> {
  const dialect = process.env.TEST_DIALECT ?? 'sqlite'

  if (dialect === 'postgres') return createIntegrationPostgresDbContext()
  if (dialect === 'sqlite') return createIntegrationSqliteDbContext()

  throw new Error(`Unknown TEST_DIALECT "${dialect}"; expected "sqlite" or "postgres".`)
}
