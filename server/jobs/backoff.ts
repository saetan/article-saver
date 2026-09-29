/** Total runs a job gets before it is failed for good (issue #12). */
export const MAX_JOB_ATTEMPTS = 3

export const BASE_BACKOFF_MS = 30_000
export const MAX_BACKOFF_MS = 15 * 60_000

/**
 * Delay before retrying a job that has just failed its `attempt`-th run
 * (1-based): exponential, `base * 2^(attempt - 1)`, capped at
 * {@link MAX_BACKOFF_MS}. With the defaults: 30s after the 1st failure, 60s
 * after the 2nd (the 3rd failure is final, so never scheduled).
 */
export function backoffDelayMs(
  attempt: number,
  baseMs: number = BASE_BACKOFF_MS,
  maxMs: number = MAX_BACKOFF_MS
): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be a positive integer, got ${attempt}`)
  }
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs)
}
