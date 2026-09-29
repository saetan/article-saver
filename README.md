# article-saver

A personal read-it-later app for web articles, PDFs, and posts from X, Threads and Instagram. Built with Nuxt 4 and hosted on Replit.

> **Status:** planning / M0 (Foundation). See the [milestones](https://github.com/saetan/article-saver/milestones).

## What it does (MVP)

- Save a web article by URL; a clean, readable copy is extracted and stored.
- Upload a PDF; the file is kept and its text extracted.
- Save X / Threads / Instagram posts as bookmarks with public preview data, plus your own pasted text.
- Organise with tags, read/unread/archived status, favourites and notes; filter and search.
- One-click saving via a bookmarklet (Android share target and iOS/iPadOS Shortcut in M2).

## Stack

| Concern | Choice |
|---|---|
| Framework | Nuxt 4 (SPA mode) + Nitro API, Nuxt UI |
| Database | Drizzle ORM — SQLite locally, PostgreSQL in production (`DB_DIALECT`) |
| Files | `BlobStorage` interface — local disk / Replit Object Storage |
| Auth | Clerk (allowlisted sign-in) + personal API tokens |
| Tests | Vitest, Testcontainers (Postgres), Playwright e2e |
| CI | GitHub Actions: unit → integration (sqlite + postgres) → e2e |

The reasoning behind each choice lives in [`docs/decisions/`](docs/decisions/). Domain terms are defined in [`CONTEXT.md`](CONTEXT.md).

## Development

Requires Node 24+ (see `.nvmrc`) and pnpm.

```sh
cp .env.example .env  # fill in values; never commit .env
pnpm install
pnpm dev               # http://localhost:3000
```

Other scripts:

```sh
pnpm build         # production build
pnpm preview        # preview the production build
pnpm lint           # eslint
pnpm format         # prettier --write
pnpm format:check   # prettier --check
pnpm typecheck      # nuxt typecheck (strict TypeScript)
pnpm test                      # unit + integration (both dialects)
pnpm test:unit                 # vitest "unit" project only (no containers)
pnpm test:integration          # vitest "integration" project, sqlite then postgres
pnpm test:integration:sqlite   # integration project against file-based SQLite
pnpm test:integration:postgres # integration project against Postgres (Testcontainers)
pnpm db:generate    # generate a migration for DB_DIALECT (sqlite | postgres)
pnpm db:migrate     # apply pending migrations for DB_DIALECT
```

The app is a Nuxt 4 SPA (`ssr: false`, `app/` directory layout) with a Nitro API under `server/`. `GET /api/health` returns `{ ok: true }`.

Postgres for local development and integration tests runs in a container (Docker or Podman — see [ADR 0012](docs/decisions/0012-testing-and-ci-strategy.md)).

### Testing (ADR 0012)

Two Vitest projects:

- **`unit`** (`**/*.unit.test.ts`) — no database, no containers. `pnpm test:unit`.
- **`integration`** (`**/*.integration.test.ts`) — runs the same repository contract suites (`server/repositories/*-repository.contract.ts`) that the `unit` project runs against in-memory SQLite, but here against a **real database**: file-based SQLite, or Postgres via `@testcontainers/postgresql`. Which dialect is selected by the `TEST_DIALECT` env var (`sqlite` | `postgres`, default `sqlite`) — this is what lets CI (#8) run the same suite as a `[sqlite, postgres]` matrix.
  - `pnpm test:integration:sqlite` — fast, no containers; each test gets its own temp SQLite file.
  - `pnpm test:integration:postgres` — starts **one** Postgres 17 Testcontainer for the whole run (Vitest `globalSetup`), migrates it, then truncates all tables before each test for isolation.
  - `pnpm test:integration` runs both, sqlite then postgres.

`pnpm test` runs `test:unit` then `test:integration`.

#### Podman (local container engine)

The container engine locally is **Podman**, with a running `podman machine`. `pnpm test:integration:postgres` runs through `scripts/testcontainers-env.mjs`, which — if `DOCKER_HOST` isn't already set — resolves it from `podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'` and sets `TESTCONTAINERS_RYUK_DISABLED=true` (Ryuk, Testcontainers' usual cleanup sidecar, doesn't run reliably under Podman). No manual env setup is needed; just make sure your Podman machine is running (`podman machine start`). The started container is stopped explicitly in Vitest's `globalTeardown` since Ryuk is disabled.

On GitHub Actions runners (plain Docker), `DOCKER_HOST` is already correct and this script is a no-op — the same command works unchanged.

If you ever need to set it manually:

```sh
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
export TESTCONTAINERS_RYUK_DISABLED=true
```

#### Local Postgres for `DB_DIALECT=postgres` dev

`compose.yaml` runs Postgres 17 plus [Adminer](https://www.adminer.org/) (a DB UI) on credentials matching `.env.example`'s `DATABASE_URL`:

```sh
podman compose up -d      # or: docker compose up -d
```

Postgres is on `localhost:5432` (`article_saver` / `article_saver` / `article_saver`), Adminer on `http://localhost:8080`. Tear down with `podman compose down -v`.

### Database (ADR 0006)

Drizzle schemas, migrations and repositories live under `server/db/` and `server/repositories/`; app code only ever talks to the repository layer (`ItemRepository`, `TagRepository`, `JobRepository`), never to Drizzle directly. `DB_DIALECT` (`sqlite` | `postgres`) selects the driver `useDb()` builds — `@libsql/client` locally, `postgres.js` in production.

- `pnpm db:generate` writes a new migration to `server/db/migrations/<dialect>/` from the schema in `server/db/schema/<dialect>.ts`. Schema changes are made in **both** dialect files and a migration generated for each.
- **Migrations are a deploy step, not automatic on server start.** Run `pnpm db:migrate` (with `DB_DIALECT=postgres` and `DATABASE_URL` set) before starting the server on every deploy. For local SQLite dev, run it once after `pnpm install` (or whenever the schema changes) — `SQLITE_PATH` defaults to `./.data/article-saver.sqlite`.

### Authentication (ADR 0002, 0005)

Sign-in is via [Clerk](https://clerk.com) (`@clerk/nuxt`), restricted to the emails listed in `ALLOWED_EMAILS` (comma-separated, case-insensitive). Set `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NUXT_CLERK_SECRET_KEY` and `ALLOWED_EMAILS` in `.env` (get the Clerk keys from your [Clerk dashboard](https://dashboard.clerk.com)).

- Every `/api/**` route except `GET /api/health` requires a Clerk session (`401` if missing) **and** a verified primary email in `ALLOWED_EMAILS` (`403` otherwise) — this is enforced server-side in `server/middleware/auth.ts`, never trusting anything client-supplied. An empty or missing `ALLOWED_EMAILS` allows nobody (fails closed).
- API handlers read the current user via `requireUserId(event)` (`server/auth/require-user-id.ts`), which throws `401` if it's somehow missing, and always pass that id into the repository layer.
- The SPA client-side route guard (`app/middleware/auth.global.ts`) is defence in depth for UX (redirects to `/sign-in` or `/not-allowed`); it is not what makes data private.

## Contributing workflow

- Every change starts from a GitHub issue; branch as `feat/<issue#>-short-name` (or `fix/`, `chore/`).
- Open a PR to `main` with `Closes #<issue>`; PRs are squash-merged.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- **Never commit secrets.** Use `.env` locally and Replit Secrets in production.

### Pre-commit hooks

Commits are checked locally by a Husky pre-commit hook (see [ADR 0012](docs/decisions/0012-testing-and-ci-strategy.md) and [ADR 0014](docs/decisions/0014-secrets-handling.md)):

1. **gitleaks** scans staged changes for secrets, using the ruleset in [`.gitleaks.toml`](.gitleaks.toml) (the default gitleaks rules, plus an allowlist for the placeholder values in `.env.example`). The commit is blocked if gitleaks isn't installed or finds a match.
2. **lint-staged** runs ESLint (`--fix`) and Prettier (`--write`) on staged files.

Install gitleaks once per machine:

```sh
brew install gitleaks
```

The hooks are installed automatically by `pnpm install` (via the `prepare` script). gitleaks is planned to also run in CI (see ADR 0012, tracked in #8) — until that CI job exists, `git commit --no-verify` bypasses the check entirely, so don't use it.

## License

[MIT](LICENSE)
