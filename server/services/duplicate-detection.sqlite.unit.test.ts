import { createTestSqliteDbContext } from '../db/testing'
import { createItemRepository } from '../repositories/item-repository'
import { runDuplicateDetectionContractTests } from './duplicate-detection.contract'

runDuplicateDetectionContractTests(async () => {
  const ctx = await createTestSqliteDbContext()
  return { repo: await createItemRepository(ctx) }
})
