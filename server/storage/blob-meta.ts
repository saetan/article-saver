/**
 * Content type isn't natively tracked by either adapter's backing store, so
 * both keep it in a small `<key>.meta.json` sidecar encoded with these
 * helpers. Shared here so the local and Replit adapters agree on the same
 * format, and so a malformed sidecar (partial write, corruption) degrades to
 * "no content type" rather than making `get()` throw.
 */

export function encodeContentType(contentType: string): string {
  return JSON.stringify({ contentType })
}

export function decodeContentType(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'contentType' in parsed &&
      typeof (parsed as { contentType: unknown }).contentType === 'string'
    ) {
      return (parsed as { contentType: string }).contentType
    }
    return null
  } catch {
    return null
  }
}
