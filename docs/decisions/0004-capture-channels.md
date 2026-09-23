# 0004. Capture channels and phasing

- **Status:** Accepted
- **Date:** 2026-09-24

## Context
Capture must be frictionless or it won't be used. The user is on Android (phone) and iPadOS. iOS/iPadOS Safari does not support the Web Share Target API.

## Decision
- **M1:** URL paste and PDF upload in the web app; a **bookmarklet** that opens `/save?url=…` using the existing browser session (works on desktop and iPadOS Safari).
- **M2:** personal **API tokens**; installable PWA with **Web Share Target** (Android); an **iOS/iPadOS Shortcut** that POSTs to the API.
- **Backlog:** browser extension, X bookmark import.

## Consequences
- The capture API must be designed in M1 so a token-authenticated client can call it in M2 without changes.
