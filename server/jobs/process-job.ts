import type { ItemRepository, JobRepository } from '../repositories/types'
import { backoffDelayMs, MAX_JOB_ATTEMPTS } from './backoff'
import { NonRetryableExtractionError, resolveExtractor, type ExtractorRegistry } from './extractor'

export const EXTRACT_JOB_TYPE = 'extract'

export interface ProcessJobDeps {
  jobs: JobRepository
  items: ItemRepository
  extractors: ExtractorRegistry
  now?: () => Date
  maxAttempts?: number
  backoffMs?: (attempt: number) => number
}

export type ProcessJobOutcome = 'idle' | 'succeeded' | 'retry_scheduled' | 'failed'

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 500) || 'Unknown error'
}

/**
 * Claims and runs at most one due job. Independent of the Nitro plugin so it
 * can be tested (and driven) directly. Never throws for a job's own failure:
 * that is recorded on the job and, when final, on the Item.
 *
 * - success: job `succeeded`, item `succeeded` with the extracted fields.
 * - retryable failure with attempts left: job back to `pending`, `run_at`
 *   pushed out by exponential backoff, error recorded.
 * - final failure (attempts exhausted, or a non-retryable error): job
 *   `failed`; item `extraction_status=failed` with `extraction_error`.
 */
export async function processNextJob(deps: ProcessJobDeps): Promise<ProcessJobOutcome> {
  const now = deps.now ?? (() => new Date())
  const maxAttempts = deps.maxAttempts ?? MAX_JOB_ATTEMPTS
  const backoff = deps.backoffMs ?? backoffDelayMs

  const job = await deps.jobs.claimNext(now())
  if (!job) return 'idle'

  try {
    if (job.type !== EXTRACT_JOB_TYPE) {
      throw new NonRetryableExtractionError(`Unknown job type "${job.type}"`)
    }
    const item = await deps.items.findById(job.userId, job.itemId)
    if (!item) throw new NonRetryableExtractionError('Item no longer exists')

    const result = await resolveExtractor(deps.extractors, item.type).extract(item)

    await deps.items.update(job.userId, job.itemId, {
      ...result,
      extractionStatus: 'succeeded',
      extractionError: null
    })
    await deps.jobs.update(job.userId, job.id, { status: 'succeeded', error: null })
    return 'succeeded'
  } catch (error) {
    const message = errorMessage(error)
    const retryable = !(error instanceof NonRetryableExtractionError)
    if (retryable && job.attempts < maxAttempts) {
      await deps.jobs.update(job.userId, job.id, {
        status: 'pending',
        error: message,
        runAt: new Date(now().getTime() + backoff(job.attempts))
      })
      return 'retry_scheduled'
    }
    await deps.items.update(job.userId, job.itemId, {
      extractionStatus: 'failed',
      extractionError: message
    })
    await deps.jobs.update(job.userId, job.id, { status: 'failed', error: message })
    return 'failed'
  }
}
