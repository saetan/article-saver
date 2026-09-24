# Context & Glossary

The shared language of this project. Use these terms in code, issues and PRs.

## Domain terms

**Item**
Anything the user has saved. One row in the `items` table. Has exactly one **Item type**.

**Item type**
What kind of thing an Item is: `article`, `pdf`, `x_post`, `threads_post`, `instagram_post`.

**Capture**
The act of getting something *into* the app. **Capture channels** are: URL paste, PDF upload, bookmarklet (M1); Android share target and iOS/iPadOS Shortcut via API token (M2).

**Extraction**
Turning a captured URL or file into stored content (title, author, readable HTML, plain text, metadata). Runs as a background **Job**. Its outcome is the Item's **Extraction status**: `pending`, `succeeded`, `failed`, `not_applicable`. A failed extraction leaves a usable bookmark that can be retried or filled in by hand (**Pasted text**).

**Extractor**
A pluggable component that performs Extraction for a given input (e.g. Readability for HTML articles, `unpdf` for PDFs, oEmbed / Open Graph for social posts).

**Readable copy**
The sanitised, distraction-free HTML of an article stored for the **Reader view**.

**Reader view**
The in-app page that displays an Item's readable copy, PDF, or social post content.

**Pasted text**
Content the user types or pastes into an Item manually, typically the rest of a social thread that couldn't be fetched.

**Library**
The list of a user's Items with filters (type, tag, status, favourite) and search.

**Status**
Where an Item is in the user's reading flow: `unread`, `read`, `archived`. Independent of **Favourite**.

**Tag**
A user-defined label. An Item can have many Tags. Tags replace folders.

**Canonical URL**
The normalised form of an Item's URL used for duplicate detection (ADR 0013): `http`/`https` only (other schemes are rejected), scheme normalised to `https`, host lower-cased with a trailing `.` stripped, tracking params (`utm_*`, `fbclid`, `gclid`, `si`, `igsh`, `igshid`, `mc_cid`, `mc_eid`, `ref_src`, `ref_url`, X's `s`/`t` share params on `x.com` only) and `#fragment` removed, trailing slash trimmed, `twitter.com`/`mobile.twitter.com`/`www.twitter.com`/`www.x.com` ≡ `x.com`, `www.` also dropped for `threads.net` and `instagram.com`.

**Duplicate**
A capture whose Canonical URL matches an existing Item of the same user. Duplicates are **not** saved; the user is told the Item already exists and linked to it (API: `409 Conflict`).

**Job**
A unit of background work stored in the `jobs` table (e.g. extract an Item). Database-backed: no Redis.

**API token**
A personal, revocable token (stored hashed) used by non-browser capture channels. Linked to the user's Clerk ID. (M2)

**Blob**
A binary file (PDF, later archived images/HTML) stored via the `BlobStorage` interface, referenced from an Item by a **blob key**.

## Technical terms

**Dialect**
Which database the app talks to, selected by `DB_DIALECT`: `sqlite` (local dev, unit tests) or `postgres` (production, integration tests).

**Repository**
The data-access layer (`ItemRepository`, `TagRepository`, …). App code talks only to repositories, never to Drizzle directly, so both dialects stay interchangeable.
