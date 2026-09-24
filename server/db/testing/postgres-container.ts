import { writeFile, rm } from 'node:fs/promises'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { resolveEnv } from '../../../scripts/testcontainers-env.mjs'
import { POSTGRES_CONFIG_PATH } from './config-path'

/**
 * Vitest `globalSetup` for the `integration` project. Starts a single
 * Postgres 17 Testcontainer for the whole test run, migrates it, and writes
 * its connection string to a temp file for `postgres-integration.ts`
 * (a separate process) to pick up. A no-op unless `TEST_DIALECT=postgres`,
 * so the SQLite run (and the `unit` project) never touches a container
 * engine (ADR 0012, #4).
 */
export default async function setup() {
  if (process.env.TEST_DIALECT !== 'postgres') {
    return async () => {}
  }

  const resolvedEnv = resolveEnv()
  for (const [key, value] of Object.entries(resolvedEnv)) {
    if (value !== undefined) process.env[key] = value
  }

  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('article_saver_test')
    .withUsername('article_saver')
    .withPassword('article_saver')
    .start()

  const connectionString = container.getConnectionUri()

  const migrationClient = postgres(connectionString, { max: 1 })
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './server/db/migrations/postgres'
    })
  } finally {
    await migrationClient.end()
  }

  await writeFile(POSTGRES_CONFIG_PATH, JSON.stringify({ connectionString }), 'utf8')

  return async () => {
    await rm(POSTGRES_CONFIG_PATH, { force: true })
    // Explicit stop: Ryuk (Testcontainers' usual cleanup sidecar) is
    // disabled under Podman (see scripts/testcontainers-env.mjs), so
    // nothing else will stop this container.
    await container.stop()
  }
}
