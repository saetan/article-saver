import { createTestSqliteDbContext } from '../db/testing'
import { createItemRepository } from '../repositories/item-repository'
import { createJobRepository } from '../repositories/job-repository'
import { runJobPipelineTests } from './process-job.contract'

runJobPipelineTests(async () => {
  const ctx = await createTestSqliteDbContext()
  return { items: await createItemRepository(ctx), jobs: await createJobRepository(ctx) }
})
