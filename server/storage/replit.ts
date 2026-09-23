import { decodeContentType, encodeContentType } from './blob-meta'
import { BlobStorageError } from './errors'
import { assertValidBlobKey } from './keys'
import type { BlobStorage } from './types'

interface ReplitRequestError {
  message: string
  statusCode?: number
}

interface ReplitResult<T> {
  ok: boolean
  value?: T
  error?: ReplitRequestError
}

/**
 * The slice of `@replit/object-storage`'s `Client` this adapter depends on.
 * Kept as a narrow structural interface (rather than importing the concrete
 * `Client` class) so tests can inject a fake instead of a real one — Replit
 * Object Storage is unreachable outside Replit.
 */
export interface ReplitStorageClient {
  uploadFromBytes(
    objectName: string,
    contents: Buffer,
    options?: { compress?: boolean }
  ): Promise<ReplitResult<null>>
  uploadFromText(objectName: string, contents: string): Promise<ReplitResult<null>>
  downloadAsBytes(objectName: string): Promise<ReplitResult<[Buffer]>>
  downloadAsText(objectName: string): Promise<ReplitResult<string>>
  delete(objectName: string, options?: { ignoreNotFound?: boolean }): Promise<ReplitResult<null>>
  exists(objectName: string): Promise<ReplitResult<boolean>>
}

export interface ReplitBlobStorageOptions {
  client: ReplitStorageClient
}

function metaKeyFor(key: string): string {
  return `${key}.meta.json`
}

function isNotFound(error: ReplitRequestError | undefined): boolean {
  return error?.statusCode === 404
}

function unwrap<T>(result: ReplitResult<T>, action: string, key: string): T {
  if (!result.ok) {
    throw new BlobStorageError(
      `Failed to ${action} blob "${key}": ${result.error?.message}`,
      result.error
    )
  }
  return result.value as T
}

/**
 * `BlobStorage` adapter backed by Replit Object Storage (ADR 0007). Content
 * type isn't natively tracked by the store, so it's kept in a small
 * `<key>.meta.json` sidecar object written alongside the blob.
 */
export function createReplitBlobStorage(options: ReplitBlobStorageOptions): BlobStorage {
  const { client } = options

  return {
    async put(key, content, contentType = null) {
      assertValidBlobKey(key)
      unwrap(await client.uploadFromBytes(key, content, { compress: false }), 'upload', key)

      if (contentType) {
        unwrap(
          await client.uploadFromText(metaKeyFor(key), encodeContentType(contentType)),
          'upload metadata for',
          key
        )
      }
    },

    async get(key) {
      assertValidBlobKey(key)
      const result = await client.downloadAsBytes(key)
      if (!result.ok) {
        if (isNotFound(result.error)) return null
        throw new BlobStorageError(
          `Failed to download blob "${key}": ${result.error?.message}`,
          result.error
        )
      }
      const [content] = unwrap(result, 'download', key)

      let contentType: string | null = null
      const metaResult = await client.downloadAsText(metaKeyFor(key))
      if (metaResult.ok) {
        contentType = decodeContentType(unwrap(metaResult, 'download metadata for', key))
      } else if (!isNotFound(metaResult.error)) {
        throw new BlobStorageError(
          `Failed to download metadata for blob "${key}": ${metaResult.error?.message}`,
          metaResult.error
        )
      }

      return { content, contentType }
    },

    async delete(key) {
      assertValidBlobKey(key)
      unwrap(await client.delete(key, { ignoreNotFound: true }), 'delete', key)
      unwrap(
        await client.delete(metaKeyFor(key), { ignoreNotFound: true }),
        'delete metadata for',
        key
      )
    },

    async exists(key) {
      assertValidBlobKey(key)
      return unwrap(await client.exists(key), 'check existence of', key)
    }
  }
}
