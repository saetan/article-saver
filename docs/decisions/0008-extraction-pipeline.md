# 0008. Article extraction pipeline

- **Status:** Accepted
- **Date:** 2026-09-24
- **Amended:** 2026-09-24 — SSRF guard restricted to https only (point 4).

## Context
Saving a URL requires the server to fetch and extract content. Some sites render client-side; slow sites would block the capture request; fetching arbitrary URLs exposes the server to SSRF.

## Decision
1. **Extractor:** `@mozilla/readability` + `linkedom`, behind an `Extractor` interface (defuddle can be swapped in later).
2. **No headless browser (Playwright) in the MVP.** Chromium is heavy on Replit, social sites block headless browsers anyway, and most articles are server-rendered. A Playwright/Browserless fallback is backlog.
3. **Asynchronous:** capture returns immediately with `extraction_status=pending`; a **database-backed `jobs` table** and in-process worker performs extraction (no Redis). Failures become `failed` with a "retry / paste content" option.
4. **SSRF guard:** https only (owner decision 2026-09-24); plain-http pages cannot be extracted and remain bookmarks with extraction failed. Resolve DNS and block private/loopback/link-local/metadata IP ranges (incl. after redirects); request timeout; max response size.
5. **Sanitisation:** extracted HTML is sanitised with DOMPurify on the server before storage (and again at render — ADR 0011).

## Consequences
- Some JS-only pages will fail extraction and remain bookmarks.
- Tests use saved HTML fixtures and a local stub HTTP server, never the live web.
