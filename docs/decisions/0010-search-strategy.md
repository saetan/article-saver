# 0010. Search: LIKE in MVP, full-text search in M3

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
Full-text search differs per dialect (SQLite FTS5 vs Postgres `tsvector`), which doubles complexity early.

## Decision
- **MVP:** case-insensitive `LIKE` matching over title, text content and notes, behind a `SearchRepository`.
- **M3:** real full-text search per dialect behind the same interface, covered by the dual-dialect test suite.

## Consequences
- Search is adequate for a few thousand items; no ranking until M3.
