/** Typed error thrown by {@link canonicalizeUrl} when the input cannot be parsed as a URL. */
export class InvalidCanonicalUrlError extends Error {
  constructor(url: string, cause?: unknown) {
    super(`"${url}" is not a valid URL and cannot be canonicalised.`)
    this.name = 'InvalidCanonicalUrlError'
    this.cause = cause
  }
}
