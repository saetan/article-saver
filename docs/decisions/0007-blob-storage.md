# 0007. BlobStorage interface for files

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
PDFs (and later archived images/HTML) must be stored. Replit's filesystem is ephemeral in deployments; storing blobs in the database bloats it.

## Decision
- A `BlobStorage` interface (`put`, `get`, `delete`, `exists`) with adapters: **`local`** (`./.data/uploads`, dev/tests) and **`replit`** (Replit Object Storage via `@replit/object-storage`). An `s3` adapter may be added later. Selected by `BLOB_STORAGE`.
- PDF upload limit **25 MB**.
- PDF text extraction with **`unpdf`** (pure JS, no native binaries).
- PDFs without a text layer are saved and flagged "no text extracted"; OCR is backlog.

## Consequences
- Items reference blobs by key, never by filesystem path.
