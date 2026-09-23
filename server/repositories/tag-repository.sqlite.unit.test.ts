import { createTestSqliteDbContext } from '../db/testing'
import { createTagRepository } from './tag-repository'
import { runTagRepositoryContractTests } from './tag-repository.contract'

runTagRepositoryContractTests(async () => {
  const ctx = await createTestSqliteDbContext()
  return { repo: createTagRepository(ctx) }
})
