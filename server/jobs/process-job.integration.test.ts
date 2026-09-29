import { createIntegrationDbContext } from '../db/testing/dialect'
import { createItemRepository } from '../repositories/item-repository'
import { createJobRepository } from '../repositories/job-repository'
import { runJobPipelineTests } from './process-job.contract'

// Same suite as process-job.sqlite.unit.test.ts, against whichever dialect
// TEST_DIALECT selects (sqlite or postgres), including the concurrent
// two-worker test.
runJobPipelineTests(async () => {
  const ctx = await createIntegrationDbContext()
  return { items: await createItemRepository(ctx), jobs: await createJobRepository(ctx) }
})
