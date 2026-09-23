import { createDbContext, type DbContext } from '../db/client'

let cached: DbContext | undefined

/**
 * Returns the process-wide db context, built once from `DB_DIALECT` (ADR
 * 0006) and cached. Server code (routes, jobs) should reach the database
 * only through this + the repository layer — never import Drizzle directly.
 */
export function useDb(): DbContext {
  if (!cached) {
    cached = createDbContext()
  }
  return cached
}
