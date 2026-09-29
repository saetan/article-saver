import { dirname } from 'node:path'

/**
 * Returns the parent directory that must exist before SQLite can create the
 * database file at `path`, or `null` when there is nothing to create
 * (in-memory databases, or a bare filename in the current directory).
 * Accepts an optional `file:` prefix. Pure: does no filesystem access.
 * Type-annotation-only TypeScript, so `scripts/db.mjs` can import it directly.
 */
export function sqliteDirToCreate(path: string): string | null {
  if (path === ':memory:' || /[?&]mode=memory(&|$)/.test(path)) return null
  const bare = path.startsWith('file:') ? path.slice('file:'.length) : path
  if (bare === '' || bare.startsWith(':memory:')) return null
  const file = bare.split('?')[0]!
  const dir = dirname(file)
  return dir === '.' && !file.startsWith('.') ? null : dir
}
