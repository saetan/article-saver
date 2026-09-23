# 0013. Single `items` table and duplicate handling

- **Status:** Accepted
- **Date:** 2026-09-24

## Decision
- One **`items`** table with a `type` discriminator and shared columns:
  `id, user_id, type, url, canonical_url, title, excerpt, content_html, content_text, pasted_text, author, published_at, site_name, image_url, status, is_favorite, notes, word_count, extraction_status, extraction_error, metadata, created_at, updated_at`.
- Type-specific extras go in the **`metadata` JSON** column (e.g. tweet ID/handle, PDF page count and blob key).
- Supporting tables: `tags`, `item_tags`, `jobs`, and `api_tokens` (M2).
- **Duplicates:** URLs are normalised to a **Canonical URL** (lower-case host; strip `utm_*`, `fbclid`, `gclid`, `si`, etc.; drop `#fragment`; trim trailing slash; `twitter.com` ≡ `x.com`). A unique index on `(user_id, canonical_url)` prevents duplicates. A duplicate capture is **not** saved: the UI shows "Already saved on <date> — Open it" and the API returns **`409 Conflict`** with the existing item's ID.

## Consequences
- Library, filters, tags and search work uniformly across item types without joins.
- PDFs without a URL have `canonical_url` NULL (not deduplicated in MVP).
