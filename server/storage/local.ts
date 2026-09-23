import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { decodeContentType, encodeContentType } from './blob-meta'
import { InvalidBlobKeyError } from './errors'
import { assertValidBlobKey } from './keys'
import type { BlobStorage } from './types'

export interface LocalBlobStorageOptions {
  /** Directory blobs are stored under, e.g. `./.data/uploads`. */
  baseDir: string
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

function metaPathFor(filePath: string): string {
  return `${filePath}.meta.json`
}

/**
 * Filesystem-backed {@link BlobStorage} adapter. Intended for local dev and
 * tests (see ADR 0007) — writes are atomic (temp file + rename) and keys are
 * validated so they can never resolve outside `baseDir`.
 */
export function createLocalBlobStorage(options: LocalBlobStorageOptions): BlobStorage {
  const baseDir = resolve(options.baseDir)

  function resolveWithinBase(key: string): string {
    assertValidBlobKey(key)
    const target = resolve(baseDir, key)
    if (target !== baseDir && !target.startsWith(baseDir + sep)) {
      throw new InvalidBlobKeyError(key, 'resolves outside the storage directory')
    }
    return target
  }

  async function writeAtomically(filePath: string, contents: string | Buffer): Promise<void> {
    const tmpPath = resolve(dirname(filePath), `.${randomUUID()}.tmp`)
    await writeFile(tmpPath, contents)
    await rename(tmpPath, filePath)
  }

  return {
    async put(key, content, contentType = null) {
      const filePath = resolveWithinBase(key)
      await mkdir(dirname(filePath), { recursive: true })
      await writeAtomically(filePath, content)

      const metaPath = metaPathFor(filePath)
      if (contentType) {
        await writeAtomically(metaPath, encodeContentType(contentType))
      } else {
        await rm(metaPath, { force: true })
      }
    },

    async get(key) {
      const filePath = resolveWithinBase(key)
      let content: Buffer
      try {
        content = await readFile(filePath)
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }

      let contentType: string | null = null
      try {
        contentType = decodeContentType(await readFile(metaPathFor(filePath), 'utf8'))
      } catch (error) {
        if (!isNotFound(error)) throw error
      }

      return { content, contentType }
    },

    async delete(key) {
      const filePath = resolveWithinBase(key)
      await rm(filePath, { force: true })
      await rm(metaPathFor(filePath), { force: true })
    },

    async exists(key) {
      const filePath = resolveWithinBase(key)
      try {
        await access(filePath)
        return true
      } catch (error) {
        if (isNotFound(error)) return false
        throw error
      }
    }
  }
}
