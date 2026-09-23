import { describe, expect, it, vi } from 'vitest'
import { BlobStorageError, InvalidBlobKeyError } from './errors'
import { runBlobStorageContractTests } from './contract-test-suite'
import { createReplitBlobStorage, type ReplitStorageClient } from './replit'

/** An in-memory fake satisfying the slice of the Replit client we use. */
function createFakeClient(): ReplitStorageClient {
  const objects = new Map<string, Buffer>()

  function notFound() {
    return { ok: false as const, error: { message: 'not found', statusCode: 404 } }
  }

  return {
    async uploadFromBytes(objectName, contents) {
      objects.set(objectName, Buffer.from(contents))
      return { ok: true, value: null }
    },
    async uploadFromText(objectName, contents) {
      objects.set(objectName, Buffer.from(contents, 'utf8'))
      return { ok: true, value: null }
    },
    async downloadAsBytes(objectName) {
      const value = objects.get(objectName)
      if (!value) return notFound()
      return { ok: true, value: [value] }
    },
    async downloadAsText(objectName) {
      const value = objects.get(objectName)
      if (!value) return notFound()
      return { ok: true, value: value.toString('utf8') }
    },
    async delete(objectName) {
      objects.delete(objectName)
      return { ok: true, value: null }
    },
    async exists(objectName) {
      return { ok: true, value: objects.has(objectName) }
    }
  }
}

runBlobStorageContractTests('replit adapter', () =>
  createReplitBlobStorage({ client: createFakeClient() })
)

describe('createReplitBlobStorage', () => {
  it('validates keys before calling the client', async () => {
    const client = createFakeClient()
    const uploadSpy = vi.spyOn(client, 'uploadFromBytes')
    const storage = createReplitBlobStorage({ client })
    await expect(storage.put('../escape.txt', Buffer.from('x'))).rejects.toThrow(
      InvalidBlobKeyError
    )
    expect(uploadSpy).not.toHaveBeenCalled()
  })

  it('wraps a non-404 upload failure in BlobStorageError', async () => {
    const client = createFakeClient()
    vi.spyOn(client, 'uploadFromBytes').mockResolvedValue({
      ok: false,
      error: { message: 'boom', statusCode: 500 }
    })
    const storage = createReplitBlobStorage({ client })
    await expect(storage.put('users/u1/a.txt', Buffer.from('x'))).rejects.toThrow(BlobStorageError)
  })

  it('wraps a non-404 download failure in BlobStorageError instead of returning null', async () => {
    const client = createFakeClient()
    vi.spyOn(client, 'downloadAsBytes').mockResolvedValue({
      ok: false,
      error: { message: 'boom', statusCode: 500 }
    })
    const storage = createReplitBlobStorage({ client })
    await expect(storage.get('users/u1/a.txt')).rejects.toThrow(BlobStorageError)
  })

  it('wraps an exists() failure in BlobStorageError', async () => {
    const client = createFakeClient()
    vi.spyOn(client, 'exists').mockResolvedValue({
      ok: false,
      error: { message: 'boom', statusCode: 500 }
    })
    const storage = createReplitBlobStorage({ client })
    await expect(storage.exists('users/u1/a.txt')).rejects.toThrow(BlobStorageError)
  })

  it('does not fail put() when content type sidecar write is skipped for null contentType', async () => {
    const client = createFakeClient()
    const uploadTextSpy = vi.spyOn(client, 'uploadFromText')
    const storage = createReplitBlobStorage({ client })
    await storage.put('users/u1/a.txt', Buffer.from('hi'), null)
    expect(uploadTextSpy).not.toHaveBeenCalled()
  })

  it('deletes both the object and its content-type sidecar', async () => {
    const client = createFakeClient()
    const deleteSpy = vi.spyOn(client, 'delete')
    const storage = createReplitBlobStorage({ client })
    await storage.put('users/u1/a.txt', Buffer.from('hi'), 'text/plain')
    await storage.delete('users/u1/a.txt')
    expect(deleteSpy).toHaveBeenCalledWith('users/u1/a.txt', { ignoreNotFound: true })
    expect(deleteSpy).toHaveBeenCalledWith('users/u1/a.txt.meta.json', { ignoreNotFound: true })
  })
})
