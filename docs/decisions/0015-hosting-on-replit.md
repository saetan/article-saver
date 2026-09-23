# 0015. Hosting on Replit, deploy early

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
Replit builds apps with its Nix-based environment (not container images) and its deployments have an ephemeral filesystem.

## Decision
- Host on **Replit** with **Replit PostgreSQL** (ADR 0006) and **Replit Object Storage** (ADR 0007); secrets in Replit Secrets.
- **Deploy a walking skeleton in M0** (sign in → empty library) to surface platform risks early.
- Portability is preserved by the dialect, storage and auth abstractions; a Dockerfile is backlog.

## Consequences
- Production must never rely on local files.
