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
```

The app is a Nuxt 4 SPA (`ssr: false`, `app/` directory layout) with a Nitro API under `server/`. `GET /api/health` returns `{ ok: true }`.

Postgres for local development and integration tests runs in a container (Docker or Podman — see [ADR 0012](docs/decisions/0012-testing-and-ci-strategy.md)). It is not required for this M0 scaffold, which has no database yet.

## Contributing workflow

- Every change starts from a GitHub issue; branch as `feat/<issue#>-short-name` (or `fix/`, `chore/`).
- Open a PR to `main` with `Closes #<issue>`; PRs are squash-merged.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- **Never commit secrets.** Use `.env` locally and Replit Secrets in production.

## License

[MIT](LICENSE)
