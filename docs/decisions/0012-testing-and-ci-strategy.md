# 0012. Testing and CI strategy

- **Status:** Accepted
- **Date:** 2026-09-24

## Decision
**Tooling:** pnpm, TypeScript strict, `@nuxt/eslint` + Prettier, Husky + lint-staged + **gitleaks** pre-commit.

**Test layers**
| Layer | Scope | Database | Needs containers |
|---|---|---|---|
| Unit (Vitest) | Single functions/modules: extractors on fixtures, SSRF checker, sanitiser, URL canonicaliser | none / in-memory SQLite | No |
| Integration (Vitest) | Repositories, API routes, jobs, token auth, without a browser | SQLite **and** Postgres via **Testcontainers** (`@testcontainers/postgresql`) | Yes |
| E2E (Playwright) | Key user flows in a real browser (save URL → read → tag → archive; PDF upload) | Postgres via Testcontainers | Yes |

- E2E signs in with **`@clerk/testing`**; external sites are replaced by a local stub HTTP server. Chromium only; keep the suite small.
- **Local Postgres:** `compose.yaml` (Postgres + a DB UI) for developing against `DB_DIALECT=postgres`.

**Container runtime:** the developer uses **Podman** locally. Compose runs via `podman compose`. For Testcontainers set `DOCKER_HOST` to the Podman machine socket (`podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'`) and, if Ryuk fails, `TESTCONTAINERS_RYUK_DISABLED=true` (or run Ryuk privileged). GitHub-hosted runners use Docker natively.

**CI (GitHub Actions), on every PR and push to `main`:**
```
Stage 1: lint + typecheck + unit
  └─ Stage 2: integration [sqlite] [postgres]   (needs: stage 1)
       └─ Stage 3: e2e                          (needs: stage 2)
```
`main` is protected; all stages are required checks. Actions minutes are free for public repositories.

## Consequences
- Integration/E2E require a running container engine locally; `pnpm test:unit` does not.
- A Dockerfile for the app itself is backlog: Replit does not deploy container images (ADR 0015).
