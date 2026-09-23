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
pnpm test           # unit test suite
pnpm test:unit      # vitest "unit" project only
pnpm db:generate    # generate a migration for DB_DIALECT (sqlite | postgres)
pnpm db:migrate     # apply pending migrations for DB_DIALECT
```

The app is a Nuxt 4 SPA (`ssr: false`, `app/` directory layout) with a Nitro API under `server/`. `GET /api/health` returns `{ ok: true }`.

Postgres for local development and integration tests runs in a container (Docker or Podman — see [ADR 0012](docs/decisions/0012-testing-and-ci-strategy.md)).

### Database (ADR 0006)

Drizzle schemas, migrations and repositories live under `server/db/` and `server/repositories/`; app code only ever talks to the repository layer (`ItemRepository`, `TagRepository`, `JobRepository`), never to Drizzle directly. `DB_DIALECT` (`sqlite` | `postgres`) selects the driver `useDb()` builds — `@libsql/client` locally, `postgres.js` in production.

- `pnpm db:generate` writes a new migration to `server/db/migrations/<dialect>/` from the schema in `server/db/schema/<dialect>.ts`. Schema changes are made in **both** dialect files and a migration generated for each.
- **Migrations are a deploy step, not automatic on server start.** Run `pnpm db:migrate` (with `DB_DIALECT=postgres` and `DATABASE_URL` set) before starting the server on every deploy. For local SQLite dev, run it once after `pnpm install` (or whenever the schema changes) — `SQLITE_PATH` defaults to `./.data/article-saver.sqlite`.

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

The hooks are installed automatically by `pnpm install` (via the `prepare` script). gitleaks also runs in CI so a bypassed local hook (`--no-verify`) is still caught.

## License

[MIT](LICENSE)
