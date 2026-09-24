import { createIntegrationDbContext } from '../db/testing/dialect'
import { createTagRepository } from './tag-repository'
import { runTagRepositoryContractTests } from './tag-repository.contract'

// Same contract suite as tag-repository.sqlite.unit.test.ts, run against
// whichever dialect TEST_DIALECT selects (sqlite or postgres) against a
// real database rather than an in-memory one (#4 / ADR 0012).
runTagRepositoryContractTests(async () => {
  const ctx = await createIntegrationDbContext()
  return { repo: await createTagRepository(ctx) }
})
