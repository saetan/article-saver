/**
 * A blob retrieved from storage: its raw bytes plus the content type it was
 * stored with, if any.
 */
export interface BlobData {
  content: Buffer
  contentType: string | null
}

/**
 * Storage for binary files (PDFs, later archived images/HTML), referenced by
 * a namespaced key such as `users/<userId>/<itemId>/original.pdf`.
 *
 * Implementations never throw for a missing key: `get` resolves to `null`
 * and `delete` is a no-op, so callers can treat every adapter identically.
 * Implementations do throw for validation failures (see {@link keys.ts}) and
 * for underlying I/O or transport errors.
 */
export interface BlobStorage {
  /** Writes `content` under `key`, overwriting any existing blob. */
  put(key: string, content: Buffer, contentType?: string | null): Promise<void>
  /** Reads the blob at `key`, or `null` if it does not exist. */
  get(key: string): Promise<BlobData | null>
  /** Removes the blob at `key`. No-op if it does not exist. */
  delete(key: string): Promise<void>
  /** Reports whether a blob exists at `key`. */
  exists(key: string): Promise<boolean>
}
