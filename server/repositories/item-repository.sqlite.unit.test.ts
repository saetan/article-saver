import { createTestSqliteDbContext } from '../db/testing'
import { createItemRepository } from './item-repository'
import { runItemRepositoryContractTests } from './item-repository.contract'

runItemRepositoryContractTests(async () => {
  const ctx = await createTestSqliteDbContext()
  return { repo: await createItemRepository(ctx) }
})
