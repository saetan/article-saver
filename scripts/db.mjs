#!/usr/bin/env node
// Dispatches `pnpm db:generate` / `pnpm db:migrate` to drizzle-kit with the
// config for the dialect selected by DB_DIALECT (ADR 0006).
import { spawnSync } from 'node:child_process'

const [command] = process.argv.slice(2)
if (command !== 'generate' && command !== 'migrate') {
  console.error(`Usage: node scripts/db.mjs <generate|migrate>`)
  process.exit(1)
}

const dialect = process.env.DB_DIALECT ?? 'sqlite'
if (dialect !== 'sqlite' && dialect !== 'postgres') {
  console.error(`Unknown DB_DIALECT "${dialect}"; expected "sqlite" or "postgres".`)
  process.exit(1)
}

const configFile = `drizzle.${dialect}.config.ts`
const result = spawnSync('pnpm', ['exec', 'drizzle-kit', command, `--config=${configFile}`], {
  stdio: 'inherit'
})
process.exit(result.status ?? 1)
