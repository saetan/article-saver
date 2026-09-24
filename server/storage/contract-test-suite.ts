import { describe, expect, it } from 'vitest'
import { InvalidBlobKeyError } from './errors'
import type { BlobStorage } from './types'

/**
 * Behaviour every {@link BlobStorage} adapter must satisfy, expressed once
 * and run against each adapter. `createAdapter` is invoked fresh for every
 * test so adapters stay isolated from each other.
 */
export function runBlobStorageContractTests(
  adapterName: string,
  createAdapter: () => Promise<BlobStorage> | BlobStorage
): void {
  describe(`BlobStorage contract (${adapterName})`, () => {
    it('reports exists() false for a key that was never written', async () => {
      const storage = await createAdapter()
      await expect(storage.exists('users/u1/missing.txt')).resolves.toBe(false)
    })

    it('resolves get() to null for a key that was never written', async () => {
      const storage = await createAdapter()
      await expect(storage.get('users/u1/missing.txt')).resolves.toBeNull()
    })

    it('resolves delete() without error for a key that was never written', async () => {
      const storage = await createAdapter()
      await expect(storage.delete('users/u1/missing.txt')).resolves.toBeUndefined()
    })

    it('round-trips content through put and get', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('hello world'))
      const result = await storage.get('users/u1/a.txt')
      expect(result?.content.toString('utf8')).toBe('hello world')
    })

    it('round-trips a content type through put and get', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.pdf', Buffer.from('%PDF-1.4'), 'application/pdf')
      const result = await storage.get('users/u1/a.pdf')
      expect(result?.contentType).toBe('application/pdf')
    })

    it('resolves contentType to null when none was given', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('hello'))
      const result = await storage.get('users/u1/a.txt')
      expect(result?.contentType).toBeNull()
    })

    it('clears a previously stored content type when overwritten without one', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.pdf', Buffer.from('%PDF-1.4'), 'application/pdf')
      await storage.put('users/u1/a.pdf', Buffer.from('plain now'))
      const result = await storage.get('users/u1/a.pdf')
      expect(result?.contentType).toBeNull()
    })

    it('preserves arbitrary binary content losslessly', async () => {
      const storage = await createAdapter()
      const bytes = Buffer.from([0, 1, 2, 9, 10, 13, 127, 200, 255])
      await storage.put('users/u1/bin.dat', bytes)
      const result = await storage.get('users/u1/bin.dat')
      expect(result?.content.equals(bytes)).toBe(true)
    })

    it('reports exists() true after a successful put', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('hi'))
      await expect(storage.exists('users/u1/a.txt')).resolves.toBe(true)
    })

    it('overwrites existing content on a repeated put', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('first'))
      await storage.put('users/u1/a.txt', Buffer.from('second'))
      const result = await storage.get('users/u1/a.txt')
      expect(result?.content.toString('utf8')).toBe('second')
    })

    it('removes a blob on delete', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('hi'))
      await storage.delete('users/u1/a.txt')
      await expect(storage.exists('users/u1/a.txt')).resolves.toBe(false)
      await expect(storage.get('users/u1/a.txt')).resolves.toBeNull()
    })

    it('rejects a key that collides with the content-type sidecar name', async () => {
      const storage = await createAdapter()
      await expect(storage.put('users/u1/x.meta.json', Buffer.from('x'))).rejects.toThrow(
        InvalidBlobKeyError
      )
    })

    it('keeps unrelated keys independent', async () => {
      const storage = await createAdapter()
      await storage.put('users/u1/a.txt', Buffer.from('a'))
      await storage.put('users/u2/a.txt', Buffer.from('b'))
      await storage.delete('users/u1/a.txt')
      const other = await storage.get('users/u2/a.txt')
      expect(other?.content.toString('utf8')).toBe('b')
    })
  })
}
