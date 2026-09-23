# 0002. Single user now, multi-user-ready schema

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
The app is personal but exposed on the internet. Adding user ownership to every table later is a painful migration; opening public sign-up brings abuse/moderation work (the server fetches arbitrary URLs).

## Decision
- Every user-owned table has a `user_id` (the Clerk user ID) and every query is scoped by it.
- No public sign-up: sign-in is restricted to an allowlist of emails (`ALLOWED_EMAILS`, enforced in Clerk and on the server).

## Consequences
- Adding more users later is a configuration change, not a migration.
- Repository methods always take the current user; tests must cover cross-user isolation.
