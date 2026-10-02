import { createItemRepository } from '../repositories/item-repository'
import { createJobRepository } from '../repositories/job-repository'
import { createArticleExtractor } from '../extraction/article-extractor'
import type { ExtractorRegistry } from '../jobs/extractor'
import { processNextJob } from '../jobs/process-job'
import { startWorker } from '../jobs/worker'

/**
 * Starts the in-process, database-backed job worker (ADR 0008: no Redis). It
 * polls for due jobs and stops cleanly on Nitro shutdown. Set
 * `JOBS_WORKER=off` to disable it (tests, or a web-only process);
 * `JOBS_POLL_MS` overrides the 2s idle poll interval.
 */
// Social posts (#17) and PDFs (#16) register their extractors here as they land.
const extractors: ExtractorRegistry = { article: createArticleExtractor() }

export default defineNitroPlugin((nitroApp) => {
  if (process.env.JOBS_WORKER === 'off') return

  const intervalMs = Number(process.env.JOBS_POLL_MS) || 2000

  const worker = startWorker({
    intervalMs,
    tick: async () => {
      const [jobs, items] = await Promise.all([createJobRepository(), createItemRepository()])
      const outcome = await processNextJob({ jobs, items, extractors })
      return outcome !== 'idle'
    },
    onError: (error) => console.error('[jobs] worker tick failed', error)
  })

  nitroApp.hooks.hook('close', () => worker.stop())
})
