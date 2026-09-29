// Starts the BUILT app (.output/server/index.mjs) against a throwaway SQLite
// db (migrations applied) and a temp blob dir. Used as Playwright's webServer.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const dataDir = mkdtempSync(path.join(tmpdir(), 'article-saver-e2e-'))

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: process.env.E2E_APP_PORT ?? '3100',
  HOST: 'localhost',
  DB_DIALECT: 'sqlite',
  SQLITE_PATH: path.join(dataDir, 'e2e.sqlite'),
  BLOB_STORAGE: 'local',
  LOCAL_BLOB_DIR: path.join(dataDir, 'uploads'),
  ALLOWED_EMAILS: process.env.E2E_CLERK_USER_EMAIL ?? '',
  SAFE_FETCH_ALLOW_HOSTS: 'localhost,127.0.0.1'
}

const migrate = spawnSync('node', ['scripts/db.mjs', 'migrate'], { env, stdio: 'inherit' })
if (migrate.status !== 0) process.exit(migrate.status ?? 1)

const server = spawn('node', ['.output/server/index.mjs'], { env, stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
server.on('exit', (code) => process.exit(code ?? 0))
