# 0006. Drizzle ORM with switchable SQLite / PostgreSQL dialect

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
The user wants to try SQLite but be able to switch database types. **Replit deployments do not persist files written to the filesystem**, so a SQLite file is unsafe in production; Replit provides managed PostgreSQL. Replit's own tooling uses Drizzle / `drizzle-kit` for migrations. Drizzle table definitions are dialect-specific (`sqliteTable` vs `pgTable`).

## Decision
- Use **Drizzle ORM** with `DB_DIALECT=sqlite|postgres`.
- Maintain **two schema files and two migration folders** (one per dialect), kept in lockstep.
- All data access goes through a **repository layer**; app code never imports Drizzle directly.
- Local dev defaults to SQLite; production on Replit uses PostgreSQL.
- A **shared repository test suite runs against both dialects** in CI to prevent drift.
- IDs are app-generated **UUIDv7** strings (identical on both dialects, non-enumerable).
- JSON columns: `text` (JSON mode) on SQLite, `jsonb` on Postgres.

## Consequences
- Every schema change is made twice; CI catches mismatches.
- Dialect-specific features (e.g. full-text search) must sit behind a repository interface.
