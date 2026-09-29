export interface WorkerHandle {
  /** Stops polling and resolves once any in-flight tick has finished. */
  stop(): Promise<void>
}

export interface WorkerOptions {
  /** Runs one unit of work; resolves `true` when it did something (so the next tick runs immediately). */
  tick: () => Promise<boolean>
  intervalMs: number
  onError?: (error: unknown) => void
}

/**
 * A minimal polling loop: run `tick` back-to-back while it keeps finding
 * work, otherwise sleep `intervalMs`. `stop()` cancels the sleep and waits
 * for the in-flight tick, so shutdown is clean.
 */
export function startWorker(options: WorkerOptions): WorkerHandle {
  let stopped = false
  let wake: (() => void) | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      wake = resolve
      timer = setTimeout(resolve, ms)
    })

  const loop = (async () => {
    while (!stopped) {
      let didWork = false
      try {
        didWork = await options.tick()
      } catch (error) {
        options.onError?.(error)
      }
      if (!stopped && !didWork) await sleep(options.intervalMs)
    }
  })()

  return {
    async stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      wake?.()
      await loop
    }
  }
}
