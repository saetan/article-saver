# 0014. Secrets never enter the repository

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
The repository is public.

## Decision
- `.env` and variants are gitignored; only `.env.example` with placeholders is committed.
- Production secrets live in **Replit Secrets**; CI secrets in **GitHub Actions secrets**.
- GitHub **secret scanning** and **push protection** are enabled.
- **gitleaks** runs in the pre-commit hook and in CI.
- API tokens are stored hashed only; they are shown to the user once.
- Logs must not print tokens, cookies or `Authorization` headers.

## Consequences
- Contributors must copy `.env.example` to `.env` for local setup.
