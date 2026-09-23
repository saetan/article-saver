import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql'
import postgres from 'postgres'
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sqliteSchema } from './schema/sqlite'
import { postgresSchema } from './schema/postgres'

export type Dialect = 'sqlite' | 'postgres'

export interface SqliteDbContext {
  dialect: 'sqlite'
  db: LibSQLDatabase<typeof sqliteSchema>
  schema: typeof sqliteSchema
}

export interface PostgresDbContext {
  dialect: 'postgres'
  db: PostgresJsDatabase<typeof postgresSchema>
  schema: typeof postgresSchema
}

export type DbContext = SqliteDbContext | PostgresDbContext

/** Creates a SQLite (libsql) db context. `url` accepts a `file:` path or `:memory:`. */
export function createSqliteDbContext(url: string): SqliteDbContext {
  const client = createClient({ url })
  return {
    dialect: 'sqlite',
    db: drizzleLibsql(client, { schema: sqliteSchema }),
    schema: sqliteSchema
  }
}

/** Creates a Postgres (postgres.js) db context from a connection string. */
export function createPostgresDbContext(connectionString: string): PostgresDbContext {
  const client = postgres(connectionString)
  return {
    dialect: 'postgres',
    db: drizzlePostgres(client, { schema: postgresSchema }),
    schema: postgresSchema
  }
}

/**
 * Builds the db context selected by `DB_DIALECT` (ADR 0006). Reads
 * `SQLITE_PATH` / `DATABASE_URL` from the given environment (defaults to
 * `process.env`) so it can be exercised in tests without touching globals.
 */
export function createDbContext(env: NodeJS.ProcessEnv = process.env): DbContext {
  const dialect = env.DB_DIALECT ?? 'sqlite'

  if (dialect === 'postgres') {
    const url =
      env.DATABASE_URL ?? 'postgres://article_saver:article_saver@localhost:5432/article_saver'
    return createPostgresDbContext(url)
  }

  if (dialect !== 'sqlite') {
    throw new Error(`Unknown DB_DIALECT "${dialect}"; expected "sqlite" or "postgres".`)
  }

  const path = env.SQLITE_PATH ?? './.data/article-saver.sqlite'
  return createSqliteDbContext(`file:${path}`)
}
