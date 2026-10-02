import { z } from 'zod'

/** Upper bound for pasted text (characters); keeps one request from storing unbounded data. */
export const MAX_PASTED_TEXT_LENGTH = 200_000

/**
 * Runtime validation for the `PATCH /api/items/:id` body. Only `pastedText`
 * is accepted (also as `pasted_text`); `.strict()` rejects every other key,
 * so a body can never set `userId`, `status`, `extractionStatus`, ... .
 * Callers pass only the parsed result on, never the raw body.
 */
const schema = z
  .object({
    pastedText: z.string().max(MAX_PASTED_TEXT_LENGTH, 'That text is too long.').optional(),
    pasted_text: z.string().max(MAX_PASTED_TEXT_LENGTH, 'That text is too long.').optional()
  })
  .strict()

export type ParsedUpdateItemBody = { ok: true; pastedText: string } | { ok: false; message: string }

export function parseUpdateItemBody(raw: unknown): ParsedUpdateItemBody {
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? 'Invalid request body.' }
  }
  const text = result.data.pastedText ?? result.data.pasted_text
  if (text === undefined || text.trim() === '') {
    return { ok: false, message: 'Pasted text is required.' }
  }
  return { ok: true, pastedText: text }
}
