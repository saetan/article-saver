import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runBlobStorageContractTests } from './contract-test-suite'
import { InvalidBlobKeyError } from './errors'
import { createLocalBlobStorage } from './local'
import { createMemoryBlobStorage } from './memory'

const tempDirs: string[] = []

async function createTempAdapter() {
  const dir = await mkdtemp(join(tmpdir(), 'blob-storage-'))
  tempDirs.push(dir)
  return createLocalBlobStorage({ baseDir: dir })
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

runBlobStorageContractTests('local adapter', createTempAdapter)
runBlobStorageContractTests('memory adapter', () => createMemoryBlobStorage())

describe('createLocalBlobStorage path safety', () => {
  it('rejects a key containing ..', async () => {
    const storage = await createTempAdapter()
    await expect(storage.put('../escape.txt', Buffer.from('x'))).rejects.toThrow(
      InvalidBlobKeyError
    )
  })

  it('rejects an absolute path key', async () => {
    const storage = await createTempAdapter()
    await expect(storage.put('/etc/passwd', Buffer.from('x'))).rejects.toThrow(InvalidBlobKeyError)
  })

  it('rejects a key containing a NUL byte', async () => {
    const storage = await createTempAdapter()
    await expect(storage.put('a\0.txt', Buffer.from('x'))).rejects.toThrow(InvalidBlobKeyError)
  })

  it('never writes outside baseDir even for get/exists/delete', async () => {
    const storage = await createTempAdapter()
    await expect(storage.get('../../etc/passwd')).rejects.toThrow(InvalidBlobKeyError)
    await expect(storage.exists('../../etc/passwd')).rejects.toThrow(InvalidBlobKeyError)
    await expect(storage.delete('../../etc/passwd')).rejects.toThrow(InvalidBlobKeyError)
  })

  it('creates nested directories for namespaced keys', async () => {
    const storage = await createTempAdapter()
    await storage.put('users/u1/item-1/original.pdf', Buffer.from('%PDF'))
    await expect(storage.exists('users/u1/item-1/original.pdf')).resolves.toBe(true)
  })

  it('leaves no stray temp files behind after a successful put', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'blob-storage-'))
    tempDirs.push(dir)
    const storage = createLocalBlobStorage({ baseDir: dir })
    await storage.put('a.txt', Buffer.from('hello'))
    const entries = await readdir(dir)
    expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([])
  })

  it('returns contentType: null instead of throwing when the meta sidecar is corrupt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'blob-storage-'))
    tempDirs.push(dir)
    const storage = createLocalBlobStorage({ baseDir: dir })
    await storage.put('a.txt', Buffer.from('hello'), 'text/plain')
    await writeFile(join(dir, 'a.txt.meta.json'), 'not valid json{{{', 'utf8')

    const result = await storage.get('a.txt')
    expect(result?.content.toString('utf8')).toBe('hello')
    expect(result?.contentType).toBeNull()
  })
})
