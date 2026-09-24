import { createIntegrationDbContext } from '../db/testing/dialect'
import { createItemRepository } from '../repositories/item-repository'
import { runDuplicateDetectionContractTests } from './duplicate-detection.contract'

// Same contract suite as duplicate-detection.sqlite.unit.test.ts, run
// against whichever dialect TEST_DIALECT selects (sqlite or postgres)
// against a real database rather than an in-memory one (#4 / ADR 0012),
// exercising the same unique index the repository relies on.
runDuplicateDetectionContractTests(async () => {
  const ctx = await createIntegrationDbContext()
  return { repo: await createItemRepository(ctx) }
})
