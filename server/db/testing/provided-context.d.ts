export {}

// Augments Vitest's ProvidedContext so `project.provide(...)` in
// postgres-container.ts's globalSetup, and `inject(...)` in
// postgres-integration.ts's worker process, are typed. This is the
// documented mechanism for passing data from globalSetup to tests
// (https://vitest.dev/config/#globalsetup) -- it replaces an earlier
// temp-file handoff, which broke when two integration runs (e.g. two agent
// worktrees) happened at once and raced on the same shared path.
declare module 'vitest' {
  interface ProvidedContext {
    postgresConnectionString: string
  }
}
