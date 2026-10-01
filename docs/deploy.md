# Deploying on Replit

## Clerk on Replit

Replit manages the Clerk instance. Its production publishable key points at the Frontend API host `clerk.<app>.replit.app`, which has no TLS certificate, so published apps must proxy Clerk's Frontend API through the app at `/__clerk` (`server/routes/__clerk/[...path].ts`).

Production secrets / environment:

- `NUXT_PUBLIC_CLERK_PROXY_URL=https://<your-app>.replit.app/__clerk`: **production only.** Clerk proxies don't work for development instances, so never set it in development.
- `ALLOWED_EMAILS`: comma-separated emails allowed to sign in.
- `NUXT_PUBLIC_APP_ORIGIN=https://<your-app>.replit.app`: used by the CSRF check.

Deployment type: Autoscale with **Max machines = 1**.
