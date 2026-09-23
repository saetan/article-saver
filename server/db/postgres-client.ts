import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { postgresSchema } from './schema/postgres'

export interface PostgresDbContext {
  dialect: 'postgres'
  db: PostgresJsDatabase<typeof postgresSchema>
  schema: typeof postgresSchema
}

/**
 * Creates a Postgres (postgres.js) db context from a connection string.
 * Kept in its own module (imported dynamically by `./client.ts`) so a
 * SQLite-only run never pulls in the `postgres` driver, and vice versa.
 */
export function createPostgresDbContext(connectionString: string): PostgresDbContext {
  const client = postgres(connectionString)
  return {
    dialect: 'postgres',
    db: drizzle(client, { schema: postgresSchema }),
    schema: postgresSchema
  }
}
