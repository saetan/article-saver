import { createTestSqliteDbContext } from '../db/testing'
import { createItemRepository } from './item-repository'
import { createJobRepository } from './job-repository'
import { runJobRepositoryContractTests } from './job-repository.contract'

runJobRepositoryContractTests(async () => {
  const ctx = await createTestSqliteDbContext()
  const item = await createItemRepository(ctx).create('user-1', {
    type: 'article',
    url: 'https://example.com/post'
  })
  return { repo: createJobRepository(ctx), itemId: item.id }
})
