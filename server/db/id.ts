import { v7 as uuidv7 } from 'uuid'

/** App-generated UUIDv7 id, identical in shape on both dialects (ADR 0006). */
export function generateId(): string {
  return uuidv7()
}
