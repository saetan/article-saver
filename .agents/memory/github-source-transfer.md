---
name: GitHub source transfer
description: Credential separation and reliable source transfer through the GitHub connector when CLI pushes are unavailable.
---

A healthy GitHub connector does not guarantee that local Git remote credentials work. Check connector API behavior separately before proposing OAuth reauthorization or asking for another credential.

**Why:** Authenticated GitHub API writes worked while CLI Git pushes rejected their separate credentials.

**How to apply:** For a requested PR, the authorized Git-data API can create a new branch without modifying main. Be explicit if this packages net file changes into one commit instead of preserving local commit history. Do not reset or rewrite local history merely to match the API-created branch.

Prefer standard encoded blob uploads followed by tree entries referencing blob hashes when transferring source through the connector.

**Why:** Embedding raw source content directly in a tree request returned an HTML 403, while base64 blob uploads succeeded through the same healthy connection.

**How to apply:** Verify the created tree hash matches the intended local Git tree before creating the branch reference. Check that the base branch has not advanced, and leave main unchanged for the user to merge the PR.