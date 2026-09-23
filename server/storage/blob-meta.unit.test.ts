import { describe, expect, it } from 'vitest'
import { decodeContentType, encodeContentType } from './blob-meta'

describe('encodeContentType / decodeContentType', () => {
  it('round-trips a content type', () => {
    expect(decodeContentType(encodeContentType('application/pdf'))).toBe('application/pdf')
  })

  it('decodes malformed JSON to null instead of throwing', () => {
    expect(decodeContentType('not json{{{')).toBeNull()
  })

  it('decodes valid JSON missing contentType to null', () => {
    expect(decodeContentType('{}')).toBeNull()
  })

  it('decodes a JSON array (unexpected shape) to null instead of throwing', () => {
    expect(decodeContentType('[1,2,3]')).toBeNull()
  })
})
