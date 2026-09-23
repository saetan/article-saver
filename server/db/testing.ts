import { migrate } from 'drizzle-orm/libsql/migrator'
import { createSqliteDbContext, type SqliteDbContext } from './client'

/**
 * A fresh, migrated in-memory SQLite db context for unit tests. Each call
 * gets its own isolated database (no shared state between tests).
 */
export async function createTestSqliteDbContext(): Promise<SqliteDbContext> {
  const ctx = createSqliteDbContext(':memory:')
  await migrate(ctx.db, { migrationsFolder: './server/db/migrations/sqlite' })
  return ctx
}
