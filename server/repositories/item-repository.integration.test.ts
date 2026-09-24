import { createIntegrationDbContext } from '../db/testing/dialect'
import { createItemRepository } from './item-repository'
import { runItemRepositoryContractTests } from './item-repository.contract'

// Same contract suite as item-repository.sqlite.unit.test.ts, run against
// whichever dialect TEST_DIALECT selects (sqlite or postgres) against a
// real database rather than an in-memory one (#4 / ADR 0012).
runItemRepositoryContractTests(async () => {
  const ctx = await createIntegrationDbContext()
  return { repo: await createItemRepository(ctx) }
})
