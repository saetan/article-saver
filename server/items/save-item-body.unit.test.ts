import { describe, expect, it } from 'vitest'
import { parseSaveItemBody } from './save-item-body'

describe('parseSaveItemBody', () => {
  it('accepts a url and trims it', () => {
    expect(parseSaveItemBody({ url: '  https://example.com/a ' })).toEqual({
      ok: true,
      body: { url: 'https://example.com/a' }
    })
  })

  it('strips extra fields instead of passing them through', () => {
    const parsed = parseSaveItemBody({
      url: 'https://example.com/a',
      userId: 'attacker',
      extractionStatus: 'succeeded',
      status: 'archived'
    })
    expect(parsed).toEqual({ ok: true, body: { url: 'https://example.com/a' } })
  })

  it.each([
    ['null', null],
    ['a string', 'https://example.com'],
    ['an array', ['https://example.com']],
    ['missing url', {}],
    ['non-string url', { url: 42 }],
    ['blank url', { url: '   ' }],
    ['huge url', { url: `https://example.com/${'a'.repeat(3000)}` }]
  ])('rejects %s', (_label, raw) => {
    const parsed = parseSaveItemBody(raw)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.message).toBeTruthy()
  })
})
