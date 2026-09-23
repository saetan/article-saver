/** A blob key or user id failed validation (e.g. path traversal, empty, bad characters). */
export class InvalidBlobKeyError extends Error {
  constructor(
    public readonly key: string,
    reason: string
  ) {
    super(`Invalid blob key "${key}": ${reason}`)
    this.name = 'InvalidBlobKeyError'
  }
}

/** An adapter failed to complete an operation against its backing store. */
export class BlobStorageError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'BlobStorageError'
  }
}
