import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { createDbContext } from './client'

describe('sqlite runtime client on a fresh checkout', () => {
  let root: string | undefined
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it('creates a missing nested SQLITE_PATH directory and connects', async () => {
    root = mkdtempSync(join(tmpdir(), 'as-sqlite-'))
    const dir = join(root, 'nope', 'deeper')
    const ctx = await createDbContext({ DB_DIALECT: 'sqlite', SQLITE_PATH: join(dir, 'x.sqlite') })
    expect(existsSync(dir)).toBe(true)
    if (ctx.dialect !== 'sqlite') throw new Error('expected sqlite')
    await ctx.db.run(sql`select 1`)
  })
})
