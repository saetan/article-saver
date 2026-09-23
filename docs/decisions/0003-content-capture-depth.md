# 0003. What is stored per item type

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
"Storing" can mean a bookmark, a readable copy, or a full archive. X, Threads and Instagram actively block scraping and their APIs are paid or restricted.

## Decision
| Type | Stored in MVP |
|---|---|
| Article | Readable copy (sanitised HTML + plain text) and metadata |
| PDF | Original file (Blob) + extracted text |
| X / Threads / Instagram | Bookmark + public preview data + structured author/date/platform + user-editable **Pasted text** |

Full archiving (raw HTML snapshot, copies of images) is milestone **M3**.

## Consequences
- Items remain useful even when extraction fails (they degrade to bookmarks).
- Deleted source posts may leave only preview data until M3.
