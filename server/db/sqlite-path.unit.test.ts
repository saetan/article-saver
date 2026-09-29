import { describe, expect, it } from 'vitest'
import { sqliteDirToCreate } from './sqlite-path'

describe('sqliteDirToCreate', () => {
  it('returns the parent of a relative path', () => {
    expect(sqliteDirToCreate('./.data/article-saver.sqlite')).toBe('./.data')
    expect(sqliteDirToCreate('data/a/b.sqlite')).toBe('data/a')
  })
  it('returns the parent of an absolute path', () => {
    expect(sqliteDirToCreate('/tmp/x/y.sqlite')).toBe('/tmp/x')
  })
  it('strips a file: prefix', () => {
    expect(sqliteDirToCreate('file:./.data/a.sqlite')).toBe('./.data')
    expect(sqliteDirToCreate('file:/tmp/x/y.sqlite')).toBe('/tmp/x')
  })
  it('skips in-memory databases', () => {
    expect(sqliteDirToCreate(':memory:')).toBeNull()
    expect(sqliteDirToCreate('file::memory:')).toBeNull()
    expect(sqliteDirToCreate('file:mem.db?mode=memory&cache=shared')).toBeNull()
  })
  it('returns null for a bare filename with no directory', () => {
    expect(sqliteDirToCreate('app.sqlite')).toBeNull()
    expect(sqliteDirToCreate('file:app.sqlite')).toBeNull()
  })
})
