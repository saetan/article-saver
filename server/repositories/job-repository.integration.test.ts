import { createIntegrationDbContext } from '../db/testing/dialect'
import { createItemRepository } from './item-repository'
import { createJobRepository } from './job-repository'
import { runJobRepositoryContractTests } from './job-repository.contract'

// Same contract suite as job-repository.sqlite.unit.test.ts, run against
// whichever dialect TEST_DIALECT selects (sqlite or postgres) against a
// real database rather than an in-memory one (#4 / ADR 0012).
runJobRepositoryContractTests(async () => {
  const ctx = await createIntegrationDbContext()
  const item = await (
    await createItemRepository(ctx)
  ).create('user-1', {
    type: 'article',
    url: 'https://example.com/post'
  })
  return { repo: await createJobRepository(ctx), itemId: item.id }
})
