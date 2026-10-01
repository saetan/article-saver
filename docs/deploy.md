# Deploying on Replit

## Clerk on Replit

Replit manages the Clerk instance and its keys: do not copy, rename, rotate or commit them. Development/preview uses the managed development instance (`pk_test_`) directly, with no proxy. A published app uses the managed production instance (`pk_live_`), whose Frontend API host has no usable TLS certificate, so the app proxies Clerk's Frontend API at `/api/__clerk` (`server/routes/api/__clerk/[...path].ts`).

No proxy URL is configured by hand. At startup `server/plugins/clerk-proxy.ts` sets the client's Clerk proxy URL to `/api/__clerk` only when the runtime publishable key is a `pk_live_` key. Do **not** set `NUXT_PUBLIC_CLERK_PROXY_URL` (the old `/__clerk` override from #57 is removed); with a development key the proxy route returns 404.

Clerk derives the proxy URL and instance host from the forwarded headers, so the route pins them to the app's public origin (`NUXT_PUBLIC_APP_ORIGIN`, else the edge's `X-Forwarded-*`). That is what avoids `host_invalid`.

`/api/__clerk` and its descendants (after path normalisation) skip the session/allowlist and CSRF middleware, because they must work before sign-in; every other `/api/**` path stays protected.

Production secrets / environment:

- `ALLOWED_EMAILS`: comma-separated emails allowed to sign in.
- `NUXT_PUBLIC_APP_ORIGIN=https://<your-app>.replit.app`: used by the CSRF check and to pin the Clerk proxy host.

After publishing, verify (owner step, pending until done):

1. `curl -i https://<your-app>.replit.app/api/__clerk/v1/environment` returns `200` with Clerk environment JSON (not `host_invalid`, not an app `401`).
2. Sign in with a permitted account; confirm a non-permitted account is denied.

Deployment type: Autoscale with **Max machines = 1**.
