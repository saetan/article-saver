# 0009. Capturing X, Threads and Instagram posts

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
X's API is paid; Meta's oEmbed for Threads/Instagram requires a reviewed Meta app and token. Unofficial mirrors (e.g. fxtwitter) are unstable. Official embed widgets load third-party trackers and break when posts are deleted.

## Decision
- **X:** public oEmbed (`publish.twitter.com/oembed`, no auth) for text, author and date of the single linked post.
- **Threads / Instagram:** Open Graph tags from the public page (best effort).
- Store structured `author`, `published_at` and platform-specific metadata; always offer **Pasted text** for the rest (e.g. remaining thread posts).
- No embed widgets. Meta oEmbed is backlog.

## Consequences
- Full X threads and many Instagram posts need manual pasting.
