# 0013. Single `items` table and duplicate handling

- **Status:** Accepted
- **Date:** 2026-09-24
- **Amended:** 2026-09-24 — `canonicalizeUrl()` implementation (#10) fixed the
  exact rules below: the https-only scheme normalisation, the full host
  alias list, the trailing-dot host fix, and the full tracking-param list.

## Decision
- One **`items`** table with a `type` discriminator and shared columns:
  `id, user_id, type, url, canonical_url, title, excerpt, content_html, content_text, pasted_text, author, published_at, site_name, image_url, status, is_favorite, notes, word_count, extraction_status, extraction_error, metadata, created_at, updated_at`.
- Type-specific extras go in the **`metadata` JSON** column (e.g. tweet ID/handle, PDF page count and blob key).
- Supporting tables: `tags`, `item_tags`, `jobs`, and `api_tokens` (M2).
- **Duplicates:** URLs are normalised to a **Canonical URL**:
  - Only `http:`/`https:` URLs are accepted (anything else is rejected outright); the scheme is normalised to `https:` (ADR 0008: the app only ever fetches over https, so `http://example.com/a` and `https://example.com/a` must dedupe as the same item). A port is dropped only when it was the default for the URL's *original* scheme.
  - The host is lower-cased and a single trailing `.` is stripped (`example.com.` ≡ `example.com`).
  - Known social hosts collapse onto one canonical host: `twitter.com`, `mobile.twitter.com` and `www.twitter.com` → `x.com`; `www.` is also dropped for `x.com`, `threads.net` and `instagram.com` specifically.
  - Tracking query params are stripped: `utm_*`, `fbclid`, `gclid`, `si`, `igsh`, `igshid`, `mc_cid`, `mc_eid`, `ref_src`, `ref_url`, and (on `x.com` only) the share-link `s`/`t` params. Every other query param is kept — it may be functional (e.g. `v` on a video `/watch` URL) — and the remaining params are sorted for stability.
  - The `#fragment` is dropped and the path's trailing slash is trimmed (except for the root `/`).

  A unique index on `(user_id, canonical_url)` prevents duplicates. A duplicate capture is **not** saved: the UI shows "Already saved on <date> — Open it" and the API returns **`409 Conflict`** with the existing item's ID.

## Consequences
- Library, filters, tags and search work uniformly across item types without joins.
- PDFs without a URL have `canonical_url` NULL (not deduplicated in MVP).
