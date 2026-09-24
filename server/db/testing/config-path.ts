import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * Where `postgres-container.ts`'s globalSetup writes the started
 * container's connection string, for `postgres-integration.ts` to read from
 * (a plain worker process, run separately from vitest's globalSetup
 * process, so the two can't share `process.env` directly).
 */
export const POSTGRES_CONFIG_PATH = path.join(tmpdir(), 'article-saver-integration-postgres.json')
