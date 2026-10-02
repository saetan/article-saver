# Deploying on Replit

## Clerk on Replit

Replit manages the Clerk instance and its keys: do not copy, rename, rotate or commit them. Development/preview uses the managed development instance (`pk_test_`) directly, with no proxy. A published app uses the managed production instance (`pk_live_`), whose Frontend API host has no usable TLS certificate, so the app proxies Clerk's Frontend API at `/api/__clerk` (`server/routes/api/__clerk/[...path].ts`).

No proxy URL is configured by hand. For each request `server/plugins/clerk-proxy.ts` forwards Replit's runtime-managed `CLERK_PROXY_URL` to the client: it is populated in production and empty in development. If it is empty but the key is a `pk_live_` key, the plugin falls back to `/api/__clerk`; with any other key the proxy URL is removed. Custom `NUXT_PUBLIC_CLERK_PROXY_URL` overrides are ignored; do **not** set that variable. With a development key the proxy route returns 404.

Clerk derives the proxy URL and instance host from the forwarded headers, so the route pins them to the app's public origin (`NUXT_PUBLIC_APP_ORIGIN`, else the edge's `X-Forwarded-*`). That is what avoids `host_invalid`.

`/api/__clerk` and its descendants (after path normalisation) skip the session/allowlist and CSRF middleware, because they must work before sign-in; every other `/api/**` path stays protected.

Production secrets / environment:

- `ALLOWED_EMAILS`: comma-separated emails allowed to sign in.
- `NUXT_PUBLIC_APP_ORIGIN=https://<your-app>.replit.app`: used by the CSRF check and to pin the Clerk proxy host.

## Database

Production uses a separate Replit-managed PostgreSQL database. `DB_DIALECT=postgres` is a shared env var in `.replit`, and `DATABASE_URL` is runtime-managed by Replit. The build and run commands contain no migration step. The workflow is: run `pnpm db:migrate` against the development database, then publish. Replit's publishing flow applies the schema changes to the production database. Before publishing, check that a new migration was applied to dev.

## File storage

Create a Replit Object Storage bucket for the app and set `BLOB_STORAGE=replit` for production. If it is unset, the app falls back to local disk, which an Autoscale deployment does not keep (ADR 0007).

## Production environment checklist

Names only, never values:

- `DB_DIALECT`, `DATABASE_URL`, `ALLOWED_EMAILS`, `NUXT_PUBLIC_APP_ORIGIN` (e.g. `https://<your-app>.replit.app`) and `BLOB_STORAGE=replit`
- Clerk keys, which are managed by Replit; do not set them by hand
- do NOT set `NUXT_PUBLIC_CLERK_PROXY_URL`

## Build/run

Autoscale, Max machines = 1. Build command:

```
bash -c "export CI=1; npm exec --yes --package=pnpm@12.4.1 -- pnpm install --frozen-lockfile && npm exec --yes --package=pnpm@12.4.1 -- pnpm build"
```

Run command:

```
node .output/server/index.mjs
```

## Production Clerk

Enable Google sign-up. Where supported, set Restrictions → Allowlist to mirror `ALLOWED_EMAILS`. The server allowlist is the real access boundary.

## Post-publish checks

After publishing, verify (owner step, pending until done):

1. `curl -i https://<your-app>.replit.app/api/__clerk/v1/environment` returns `200` with Clerk environment JSON (not `host_invalid`, not an app `401`).
2. A returning allowlisted account can sign in.
3. A first-time allowlisted Google sign-up works.
4. A non-allowlisted account lands on `/not-allowed`.
