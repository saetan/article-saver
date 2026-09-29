import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { mkdirSync } from 'node:fs'
import { sqliteSchema } from './schema/sqlite'
import { sqliteDirToCreate } from './sqlite-path'

export interface SqliteDbContext {
  dialect: 'sqlite'
  db: LibSQLDatabase<typeof sqliteSchema>
  schema: typeof sqliteSchema
}

/**
 * Creates a SQLite (libsql) db context. `url` accepts a `file:` path or
 * `:memory:`. Kept in its own module (imported dynamically by
 * `./client.ts`) so a Postgres-only deployment never pulls in
 * `@libsql/client`'s platform-specific native binary.
 */
export function createSqliteDbContext(url: string): SqliteDbContext {
  // SQLite creates a missing file but not its parent directory.
  const dir = sqliteDirToCreate(url)
  if (dir) mkdirSync(dir, { recursive: true })
  const client = createClient({ url })
  return { dialect: 'sqlite', db: drizzle(client, { schema: sqliteSchema }), schema: sqliteSchema }
}
