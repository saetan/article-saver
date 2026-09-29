import { describe, expect, it, vi } from 'vitest'
import { startWorker } from './worker'

describe('startWorker', () => {
  it('ticks again immediately while there is work, then sleeps', async () => {
    const results = [true, true, false]
    const tick = vi.fn(async () => results.shift() ?? false)
    const worker = startWorker({ tick, intervalMs: 60_000 })
    await vi.waitFor(() => expect(tick).toHaveBeenCalledTimes(3))
    await worker.stop()
    expect(tick).toHaveBeenCalledTimes(3)
  })

  it('stop() interrupts the idle sleep and resolves promptly', async () => {
    const tick = vi.fn(async () => false)
    const worker = startWorker({ tick, intervalMs: 60_000 })
    await vi.waitFor(() => expect(tick).toHaveBeenCalledTimes(1))
    await worker.stop()
    expect(tick).toHaveBeenCalledTimes(1)
  })

  it('stop() waits for the in-flight tick', async () => {
    let finished = false
    const worker = startWorker({
      intervalMs: 10,
      tick: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        finished = true
        return false
      }
    })
    await worker.stop()
    expect(finished).toBe(true)
  })

  it('reports a failing tick and keeps polling', async () => {
    const onError = vi.fn()
    let calls = 0
    const worker = startWorker({
      intervalMs: 5,
      onError,
      tick: async () => {
        if (++calls === 1) throw new Error('db down')
        return false
      }
    })
    await vi.waitFor(() => expect(calls).toBeGreaterThanOrEqual(2))
    await worker.stop()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
