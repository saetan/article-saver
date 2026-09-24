import { createDbContext, type DbContext } from '../db/client'

let cached: Promise<DbContext> | undefined

/**
 * Returns the process-wide db context, built once from `DB_DIALECT` (ADR
 * 0006) and cached. Server code (routes, jobs) should reach the database
 * only through this + the repository layer — never import Drizzle directly.
 *
 * Async because only the selected dialect's driver is imported (ADR 0006:
 * two dialects, one deployment uses each) — a Postgres deployment never
 * loads the SQLite driver's native binary, and vice versa.
 */
export function useDb(): Promise<DbContext> {
  if (!cached) {
    cached = createDbContext()
  }
  return cached
}
