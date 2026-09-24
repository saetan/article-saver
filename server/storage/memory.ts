import { assertValidBlobKey } from './keys'
import type { BlobData, BlobStorage } from './types'

/**
 * An in-memory {@link BlobStorage} adapter. Not for production use — it
 * exists so other modules (e.g. repositories or API handlers) can unit-test
 * against a `BlobStorage` without touching the filesystem or a network
 * client.
 */
export function createMemoryBlobStorage(): BlobStorage {
  const blobs = new Map<string, BlobData>()

  return {
    async put(key, content, contentType = null) {
      assertValidBlobKey(key)
      blobs.set(key, { content: Buffer.from(content), contentType })
    },
    async get(key) {
      assertValidBlobKey(key)
      const blob = blobs.get(key)
      if (!blob) return null
      return { content: Buffer.from(blob.content), contentType: blob.contentType }
    },
    async delete(key) {
      assertValidBlobKey(key)
      blobs.delete(key)
    },
    async exists(key) {
      assertValidBlobKey(key)
      return blobs.has(key)
    }
  }
}
