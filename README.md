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
| Database | Drizzle ORM — PostgreSQL in Replit development and production; SQLite for tests (`DB_DIALECT`) |
| Files | `BlobStorage` interface — local disk / Replit Object Storage |
| Auth | Clerk (allowlisted sign-in) + personal API tokens |
| Tests | Vitest, Testcontainers (Postgres), Playwright e2e |
| CI | GitHub Actions: unit → integration (sqlite + postgres) → e2e |

The reasoning behind each choice lives in [`docs/decisions/`](docs/decisions/). Domain terms are defined in [`CONTEXT.md`](CONTEXT.md).

## Development

Requires Node 24+ (see `.nvmrc`) and pnpm 12.4.1.

On Replit, `DB_DIALECT=postgres` is configured for both development and
production. Replit provides a separate managed `DATABASE_URL` in each
environment; do not copy a database URL between them. Run `pnpm db:migrate`
against development after installing dependencies. Replit applies the schema
to its managed production database when you publish.

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
pnpm test:e2e                  # Playwright e2e against the built app (see "E2E tests")
pnpm db:generate    # generate a migration for DB_DIALECT (sqlite | postgres)
pnpm db:migrate     # apply pending migrations for DB_DIALECT
```

The app is a Nuxt 4 SPA (`ssr: false`, `app/` directory layout) with a Nitro API under `server/`. `GET /api/health` returns `{ ok: true }`.

For local development outside Replit, Postgres can run in a container (Docker or Podman — see [ADR 0012](docs/decisions/0012-testing-and-ci-strategy.md)).

### Saving URLs, the job queue and CSRF

- `POST /api/items` `{ url }` saves a URL: it is canonicalised (ADR 0013), the Item type is detected from the host (`x.com` -> `x_post`, `threads.net` -> `threads_post`, `instagram.com` -> `instagram_post`, otherwise `article`), the Item is created with `extraction_status=pending` and an `extract` job is queued. Responses: `201` Item, `400` invalid or non-http(s) URL, `409 { existingItemId, savedAt }` duplicate. Only `url` is read from the body (zod); the user id always comes from the session.
- `GET /api/items` (newest 50) and `GET /api/items/:id` are user-scoped; another user's item is `404`.
- **Jobs** (ADR 0008): a Nitro plugin (`server/plugins/jobs-worker.ts`) polls the `jobs` table. Claiming is atomic on both dialects (`JobRepository.claimNext`: Postgres `FOR UPDATE SKIP LOCKED`, SQLite single writer). A failed job is retried with exponential backoff (30s, 60s) up to 3 attempts, then the Item becomes `extraction_status=failed` with `extraction_error`. A job left `running` (crash, redeploy) is re-claimed after a 5 minute lease (counted as an attempt), so extractors must finish within it. Extractors are looked up by Item type in `server/jobs/extractor.ts`; a type without one fails immediately with "Extraction not available yet" (real extractors: #13, #16, #17). `JOBS_WORKER=off` disables the worker (tests); `JOBS_POLL_MS` sets the idle poll interval (default 2000).
- **CSRF** (`server/middleware/02.csrf.ts`): POST/PUT/PATCH/DELETE to `/api/**` must be same-origin: the `Origin` header must equal the request's own origin, or, when `Origin` is absent, `Sec-Fetch-Site` must be `same-origin`; otherwise `403`. The expected origin is `NUXT_PUBLIC_APP_ORIGIN` when set, otherwise derived from `X-Forwarded-Host`/`-Proto`. M2 API-token (Bearer) requests will bypass this via `isBearerTokenRequest` in `server/auth/csrf.ts` (a stub that returns false today). Non-browser clients therefore cannot call these endpoints until tokens exist.

### Testing (ADR 0012)

Two Vitest projects:

- **`unit`** (`**/*.unit.test.ts`) — no database, no containers. `pnpm test:unit`.
- **`integration`** (`**/*.integration.test.ts`) — runs the same repository contract suites (`server/repositories/*-repository.contract.ts`) that the `unit` project runs against in-memory SQLite, but here against a **real database**: file-based SQLite, or Postgres via `@testcontainers/postgresql`. Which dialect is selected by the `TEST_DIALECT` env var (`sqlite` | `postgres`, default `sqlite`) — this is what lets CI (#8) run the same suite as a `[sqlite, postgres]` matrix.
  - `pnpm test:integration:sqlite` — fast, no containers; each test gets its own temp SQLite file.
  - `pnpm test:integration:postgres` — starts **one** Postgres 17 Testcontainer for the whole run (Vitest `globalSetup`), migrates it, then truncates all tables before each test for isolation.
  - `pnpm test:integration` runs both, sqlite then postgres.

`pnpm test` runs `test:unit` then `test:integration`.

#### E2E tests

`pnpm test:e2e` runs [Playwright](https://playwright.dev) (Chromium only) against the **built** app. One-time browser install: `pnpm exec playwright install chromium`.

What `playwright.config.ts` starts (its `webServer`):

- **Stub HTTP server** (`e2e/stub-server`, port 4010) serving fixtures — an article page, an Open Graph-only page and an X oEmbed JSON mock — so tests never touch the real internet.
- **The app**: `pnpm build`, then `.output/server/index.mjs` on port 3100 with `NODE_ENV=test`, a throwaway file-based SQLite db (migrated, in a temp dir), local blob storage in that temp dir, `ALLOWED_EMAILS` set to the e2e user, and `SAFE_FETCH_ALLOW_HOSTS=localhost,127.0.0.1` (only honoured under `NODE_ENV=test`) so `safeFetch` may reach the stub.

Sign-in uses [`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview): `clerkSetup()` in the global setup, `setupClerkTestingToken` per page and `clerk.signIn({ page, emailAddress })`, which signs in by sign-in token minted with the secret key (no password). The user must **already exist in your Clerk _development_ instance**; tests never create or delete users.

Required env (from `.env` locally, or CI secrets; **development-instance values only**):

| Variable                            | Purpose                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dev publishable key (also mapped to `CLERK_PUBLISHABLE_KEY` for `@clerk/testing`)  |
| `NUXT_CLERK_SECRET_KEY`             | Clerk dev secret key (also mapped to `CLERK_SECRET_KEY` for `@clerk/testing`)            |
| `E2E_CLERK_USER_EMAIL`              | Email of the existing, allowlisted test user; defaults to the first `ALLOWED_EMAILS` entry |

The `CLERK_*` mapping happens inside `e2e/env.ts`, not in `.env`.

**GitHub Actions secrets the CI e2e job (#8) needs:** `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NUXT_CLERK_SECRET_KEY`, `E2E_CLERK_USER_EMAIL`.

#### Reading e2e results in CI

Every CI run (pass or fail) publishes the e2e evidence, with no extra permissions and no PR comment bot:

- **Summary:** PR → Checks → the CI run → **Summary**. The "End-to-end results" table lists each test's status and duration plus totals (written by `scripts/e2e-summary.mjs` from Playwright's JSON reporter).
- **Report and screenshots:** the same page's **Artifacts** section holds `playwright-report-<run_id>-<attempt>` (HTML report, traces, and a screenshot per test under `test-results/`), kept 14 days. Download and unzip it, then `pnpm exec playwright show-report <dir>/playwright-report`.

Screenshots are `on` in CI and `only-on-failure` locally. They only show app UI with test data; secrets are never rendered.

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
- **Migrations are not automatic on server start.** For Replit's managed database, apply migrations to development with `pnpm db:migrate`; publishing carries the development schema to production. Do not run the migration command against Replit production. For local SQLite dev, run it once after `pnpm install` (or whenever the schema changes) — `SQLITE_PATH` defaults to `./.data/article-saver.sqlite`, and its directory is created automatically (by `pnpm db:migrate` and by the app at startup).

### Authentication (ADR 0002, 0005)

Sign-in is via Clerk (`@clerk/nuxt`), restricted to the emails listed in `ALLOWED_EMAILS` (comma-separated, case-insensitive). On Replit, Clerk keys are provisioned as workspace secrets and wired into the Nuxt runtime config. Set `ALLOWED_EMAILS` to the account email(s) allowed to sign in. Outside Replit, set `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NUXT_CLERK_SECRET_KEY` and `ALLOWED_EMAILS` in `.env`.

**Production Clerk setup.** The app serves Clerk's path-routed `/sign-in/**` and `/sign-up/**` pages. In the Production Clerk instance, enable sign-up for Google. Where the Clerk dashboard supports it, set Restrictions → Allowlist to mirror `ALLOWED_EMAILS`. If it does not (e.g. the Replit-managed dashboard), anyone can create a Clerk user, but every `/api/**` request gets `403` from `server/middleware/01.auth.ts`, so no data is exposed.

- Every `/api/**` route except `GET /api/health` requires a Clerk session (`401` if missing) **and** a verified primary email in `ALLOWED_EMAILS` (`403` otherwise) — this is enforced server-side by `server/middleware/00.clerk.ts` (installs Clerk's session middleware) followed by `server/middleware/01.auth.ts` (the allowlist check); the numeric prefixes fix their order, see `order.unit.test.ts`. Nothing client-supplied is ever trusted. Never trusting anything client-supplied. An empty or missing `ALLOWED_EMAILS` allows nobody (fails closed).
- `server/routes/api/__clerk/[...path].ts` proxies Clerk's Frontend API at `/api/__clerk` for the Replit production instance (only with a `pk_live_` key; the client is pointed at it by `server/plugins/clerk-proxy.ts`). That exact path and its descendants skip the auth and CSRF middleware; all other `/api/**` stays protected. See `docs/deploy.md`.
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

The hooks are installed automatically by `pnpm install` (via the `prepare` script). The same gitleaks scan also runs in CI over the full git history (see [CI](#ci)), but `git commit --no-verify` still bypasses the local check, so don't use it.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and on pushes to `main`, in stages (ADR 0012):

1. **Static checks**: lint, Prettier check, typecheck, unit tests, build, and a gitleaks scan of the full history.
2. **Integration (sqlite)** and **Integration (postgres)**: run in parallel once static passes (Postgres via Testcontainers).
3. **End-to-end**: Playwright (Chromium) against Clerk. It fails if the Clerk secrets below are missing, except on fork PRs (which can't receive secrets), where it is skipped with a notice.

The repository owner must add these under GitHub → Settings → Secrets and variables → Actions for the e2e stage:

- `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NUXT_CLERK_SECRET_KEY`
- `E2E_CLERK_USER_EMAIL`

## License

[MIT](LICENSE)
