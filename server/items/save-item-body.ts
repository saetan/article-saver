import { z } from 'zod'

/**
 * Runtime validation for the `POST /api/items` body. Only `url` is accepted:
 * zod object schemas strip unknown keys, and callers must pass only the
 * parsed result on, never the raw body, so a client can never smuggle
 * `userId`, `status`, `extractionStatus`, ... into the repository (closes
 * the #3 follow-up about `userId` injection).
 */
export const saveItemBodySchema = z.object({
  url: z.string().trim().min(1, 'A URL is required.').max(2048, 'That URL is too long.')
})

export type SaveItemBody = z.infer<typeof saveItemBodySchema>

export type ParsedSaveItemBody = { ok: true; body: SaveItemBody } | { ok: false; message: string }

export function parseSaveItemBody(raw: unknown): ParsedSaveItemBody {
  const result = saveItemBodySchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? 'Invalid request body.' }
  }
  return { ok: true, body: result.data }
}
