#!/usr/bin/env node
// Resolves the container engine socket for Testcontainers before the
// integration suite runs (ADR 0012). On the developer's machine the engine
// is Podman; on GitHub Actions runners it's Docker and this is a no-op.
//
// If `DOCKER_HOST` is already set, it's left untouched. Otherwise, when a
// Podman machine is running, its socket is used and `DOCKER_HOST` is
// exported for the child process. Ryuk (the Testcontainers cleanup
// sidecar) is unreliable under Podman, so it's disabled here too --
// `server/db/testing/postgres-container.ts` stops the container itself in
// globalTeardown.
import { spawnSync } from 'node:child_process'

function podmanSocketPath() {
  const result = spawnSync(
    'podman',
    ['machine', 'inspect', '--format', '{{.ConnectionInfo.PodmanSocket.Path}}'],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) return undefined
  const path = result.stdout.trim()
  return path.length > 0 ? path : undefined
}

function resolveEnv(env = process.env) {
  const resolved = { ...env }

  if (!resolved.DOCKER_HOST) {
    const socketPath = podmanSocketPath()
    if (socketPath) {
      resolved.DOCKER_HOST = `unix://${socketPath}`
      resolved.TESTCONTAINERS_RYUK_DISABLED ??= 'true'
    }
  }

  return resolved
}

export { resolveEnv, podmanSocketPath }

// Run as a CLI: `node scripts/testcontainers-env.mjs <command> [args...]`
// execs `command` with the resolved environment. Guarded so importing this
// module (e.g. from vitest's globalSetup, running in a worker thread with
// its own unrelated argv) never triggers this.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const [command, ...args] = process.argv.slice(2)
  if (!command) {
    console.error('Usage: node scripts/testcontainers-env.mjs <command> [args...]')
    process.exit(1)
  }
  const env = resolveEnv()
  const result = spawnSync(command, args, { stdio: 'inherit', env })
  process.exit(result.status ?? 1)
}
