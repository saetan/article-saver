import { defineConfig } from 'vitest/config'

const commonExclude = [
  '**/node_modules/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/dist/**',
  '**/.claude/**'
]

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.unit.test.ts'],
          exclude: commonExclude
        }
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.integration.test.ts'],
          exclude: commonExclude,
          globalSetup: ['./server/db/testing/postgres-container.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          teardownTimeout: 30_000,
          // Postgres integration tests share one Testcontainer + connection
          // for the whole run and isolate via per-test TRUNCATE (ADR 0012);
          // running test files in parallel would let them race on the same
          // tables, so the whole project runs sequentially instead.
          fileParallelism: false
        }
      }
    ]
  }
})
