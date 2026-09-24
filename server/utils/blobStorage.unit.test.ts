import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

// The real Client talks to Replit's sidecar over the network on construction;
// stub it so selecting the replit adapter in tests stays hermetic.
vi.mock('@replit/object-storage', () => ({
  Client: class FakeClient {
    marker = 'fake-replit-client'
  }
}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('useBlobStorage', () => {
  it('defaults to the local adapter when BLOB_STORAGE is unset', async () => {
    delete process.env.BLOB_STORAGE
    const { useBlobStorage } = await import('./blobStorage')
    const storage = useBlobStorage()
    expect(storage).toMatchObject({ put: expect.any(Function), get: expect.any(Function) })
  })

  it('selects the local adapter for BLOB_STORAGE=local', async () => {
    process.env.BLOB_STORAGE = 'local'
    const { useBlobStorage } = await import('./blobStorage')
    expect(() => useBlobStorage()).not.toThrow()
  })

  it('selects the replit adapter for BLOB_STORAGE=replit', async () => {
    process.env.BLOB_STORAGE = 'replit'
    const { useBlobStorage } = await import('./blobStorage')
    expect(() => useBlobStorage()).not.toThrow()
  })

  it('throws for an unknown BLOB_STORAGE value', async () => {
    process.env.BLOB_STORAGE = 'nonsense'
    const { useBlobStorage } = await import('./blobStorage')
    expect(() => useBlobStorage()).toThrow(/BLOB_STORAGE/)
  })

  it('returns the same instance on repeated calls (caches the adapter)', async () => {
    process.env.BLOB_STORAGE = 'local'
    const { useBlobStorage } = await import('./blobStorage')
    expect(useBlobStorage()).toBe(useBlobStorage())
  })
})
