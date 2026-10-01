---
name: Replit import toolchain
description: Toolchain mismatches encountered while setting up imported Node/Nuxt projects on Replit.
---

Imported Replit module lists can retain an older framework-specific Node module even after installing the version required by the project. Check the shell's actual `node --version` against `.nvmrc` and remove stale module conflicts through the validated Replit config flow.

When `package.json` pins a pnpm version newer than Replit's shell pnpm, invoke the project-pinned version for installs and scripts; older pnpm may reject a lockfile written by the pinned release. For noninteractive Nuxt commands, set `CI=1` to avoid first-run telemetry prompts that require a TTY.

**Why:** An imported Node 20 module shadowed the project's Node 24 runtime, while the bundled pnpm 10 could not read this project's pnpm 12 lockfile; Nuxt telemetry also attempted to prompt in a noninteractive shell.

**How to apply:** Before installing dependencies in imported Node projects, compare `.nvmrc`, `packageManager`, and the active Replit modules. Use the pinned package manager and disable interactive prompts for shell-based Nuxt checks.

For publishing, the automatic hosting dependency install runs before the configured build command. Pinning pnpm only in that build command does not protect the earlier install. Do not assume `packager.features.enabledForHosting = false` suppresses it: the publishing pipeline still ran automatic installation with that validated setting.

Keep pnpm's self-managed tool cache outside the project workspace, and apply that setting before the automatic installer switches versions. A project-local cache can cause bootstrap subprocesses to inherit the enclosing workspace's package-manager selection and recursively install the same pinned version. A shared Replit environment-variable setting alone did not prevent this during publishing, despite working locally.

**Why:** Publishing logs eventually exposed nested pnpm self-install commands ending in OS thread exhaustion and SIGABRT, before the application build ran. An external cache worked locally; relocating it through pnpm's configuration hook also passed a cold bootstrap with the older system manager and an explicitly project-local `PNPM_HOME`.

**How to apply:** Do not assume shared environment settings reach the automatic publishing installer. Use package-manager configuration loaded before version selection to relocate only the mismatched-version bootstrap. Configuration-only pnpmfile hooks still require a lockfile checksum; preserve the existing dependency graph when refreshing that checksum and verify frozen installation. Cache contents are disposable, not application data.