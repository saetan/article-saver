# 0011. Frontend: Nuxt 4, Nuxt UI, SPA mode, sanitised rendering

- **Status:** Accepted
- **Date:** 2026-09-24

## Decision
- **Nuxt 4** (`app/` directory layout) with **Nuxt UI** (Tailwind-based).
- **SPA mode (`ssr: false`)**: everything is behind login and needs no SEO; simpler with Clerk and cheaper on Replit. The Nitro server still serves the API.
- **All stored third-party HTML is untrusted:** sanitised with DOMPurify on the server before storage **and** again on render; scripts, iframes, forms and event-handler attributes are stripped. Never use `v-html` on unsanitised content.

## Consequences
- No server-rendered pages; first paint shows an app shell.
