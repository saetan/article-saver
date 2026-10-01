---
name: Replit import toolchain
description: Toolchain mismatches encountered while setting up imported Node/Nuxt projects on Replit.
---

Imported Replit module lists can retain an older framework-specific Node module even after installing the version required by the project. Check the shell's actual `node --version` against `.nvmrc` and remove stale module conflicts through the validated Replit config flow.

When `package.json` pins a pnpm version newer than Replit's shell pnpm, invoke the project-pinned version for installs and scripts; older pnpm may reject a lockfile written by the pinned release. For noninteractive Nuxt commands, set `CI=1` to avoid first-run telemetry prompts that require a TTY.

**Why:** An imported Node 20 module shadowed the project's Node 24 runtime, while the bundled pnpm 10 could not read this project's pnpm 12 lockfile; Nuxt telemetry also attempted to prompt in a noninteractive shell.

**How to apply:** Before installing dependencies in imported Node projects, compare `.nvmrc`, `packageManager`, and the active Replit modules. Use the pinned package manager and disable interactive prompts for shell-based Nuxt checks.