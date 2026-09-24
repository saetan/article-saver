import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createSqliteDbContext, type SqliteDbContext } from '../sqlite-client'

/**
 * A fresh, migrated **file-based** SQLite db context for the integration
 * suite — distinct from the in-memory context `../testing.ts` gives unit
 * tests, closer to how SQLite actually runs in production. Each call gets
 * its own temp file (and so is isolated without needing a truncate step).
 */
export async function createIntegrationSqliteDbContext(): Promise<SqliteDbContext> {
  const dir = mkdtempSync(path.join(tmpdir(), 'article-saver-sqlite-'))
  const dbPath = path.join(dir, 'test.sqlite')
  const ctx = createSqliteDbContext(`file:${dbPath}`)
  await migrate(ctx.db, { migrationsFolder: './server/db/migrations/sqlite' })
  return ctx
}
