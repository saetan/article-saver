import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'
import { resolveEnv } from '../../../scripts/testcontainers-env.mjs'
// `./provided-context.d.ts` augments Vitest's ProvidedContext type; it has
// no runtime output, so it's picked up by the TS program (tsconfig's
// `include`) rather than imported here.

/**
 * Vitest `globalSetup` for the `integration` project. Starts a single
 * Postgres 17 Testcontainer for the whole test run, migrates it, and hands
 * its connection string to test files via Vitest's `provide`/`inject`
 * (see `provided-context.d.ts`) rather than a shared file, so two
 * integration runs happening at once (e.g. two agent worktrees) can't
 * clobber each other's connection info. A no-op unless
 * `TEST_DIALECT=postgres`, so the SQLite run (and the `unit` project) never
 * touches a container engine (ADR 0012, #4).
 */
export default async function setup(project: TestProject) {
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

  project.provide('postgresConnectionString', connectionString)

  return async () => {
    // Explicit stop: Ryuk (Testcontainers' usual cleanup sidecar) is
    // disabled under Podman (see scripts/testcontainers-env.mjs), so
    // nothing else will stop this container.
    await container.stop()
  }
}
