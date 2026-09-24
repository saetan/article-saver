/**
 * Typed errors thrown by {@link safeFetch}. Callers can `instanceof`-check
 * these to decide how to react (e.g. mark an Item's extraction as `failed`
 * vs. retry later).
 */

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** The URL is malformed, uses an unsupported scheme, or embeds credentials. */
export class InvalidUrlError extends SafeFetchError {}

/**
 * The URL's host - or one of the addresses it resolves to - falls inside a
 * non-public IP range (loopback, private, link-local, cloud metadata, etc.)
 * and the request was refused before any bytes were sent.
 */
export class BlockedUrlError extends SafeFetchError {}

/** The response body exceeded the configured byte limit. */
export class TooLargeError extends SafeFetchError {}

/** The request did not complete within the configured total timeout. */
export class TimeoutError extends SafeFetchError {}

/** The request followed more redirects than the configured maximum. */
export class TooManyRedirectsError extends SafeFetchError {}
