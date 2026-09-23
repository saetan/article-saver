# 0005. Clerk for authentication, own API tokens for non-browser clients

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
Options were Replit Auth (zero setup on Replit, but host lock-in, awkward locally, requires Replit accounts) and Clerk (hosted, official Nuxt SDK, works anywhere, restricted sign-up mode).

## Decision
- Use **Clerk** via `@clerk/nuxt` for browser sessions, with restricted/allowlist sign-up.
- For non-browser clients (bookmarklet is session-based; Shortcut and share target are not) issue **our own personal API tokens**: random, shown once, stored **hashed** (SHA-256), sent as `Authorization: Bearer …`, revocable, linked to the Clerk user ID.

## Consequences
- The app is not tied to Replit for auth.
- Clerk keys are secrets (see ADR 0014). E2E tests sign in with `@clerk/testing`.
