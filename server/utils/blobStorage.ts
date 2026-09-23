import { Client } from '@replit/object-storage'
import { createLocalBlobStorage } from '../storage/local'
import { createReplitBlobStorage } from '../storage/replit'
import type { BlobStorage } from '../storage/types'

const DEFAULT_LOCAL_BLOB_DIR = './.data/uploads'

let cachedStorage: BlobStorage | undefined

function buildBlobStorage(): BlobStorage {
  const driver = process.env.BLOB_STORAGE ?? 'local'

  switch (driver) {
    case 'local':
      return createLocalBlobStorage({
        baseDir: process.env.LOCAL_BLOB_DIR ?? DEFAULT_LOCAL_BLOB_DIR
      })
    case 'replit':
      return createReplitBlobStorage({ client: new Client() })
    default:
      throw new Error(`Unknown BLOB_STORAGE driver "${driver}". Expected "local" or "replit".`)
  }
}

/**
 * Returns the process-wide {@link BlobStorage} adapter selected by the
 * `BLOB_STORAGE` env var (`local` by default, or `replit`; see ADR 0007).
 * The instance is created once and cached.
 */
export function useBlobStorage(): BlobStorage {
  cachedStorage ??= buildBlobStorage()
  return cachedStorage
}
