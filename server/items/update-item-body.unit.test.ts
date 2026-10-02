import { describe, expect, it } from 'vitest'
import { MAX_PASTED_TEXT_LENGTH, parseUpdateItemBody } from './update-item-body'

describe('parseUpdateItemBody', () => {
  it('accepts pastedText and pasted_text', () => {
    expect(parseUpdateItemBody({ pastedText: 'hi' })).toEqual({ ok: true, pastedText: 'hi' })
    expect(parseUpdateItemBody({ pasted_text: 'hi' })).toEqual({ ok: true, pastedText: 'hi' })
  })

  it.each([
    ['unknown field', { pastedText: 'x', userId: 'attacker' }],
    ['other column only', { status: 'archived' }],
    ['empty', {}],
    ['blank text', { pastedText: '   ' }],
    ['non-string', { pastedText: 5 }],
    ['too long', { pastedText: 'a'.repeat(MAX_PASTED_TEXT_LENGTH + 1) }],
    ['not an object', 'text'],
    ['undefined', undefined]
  ])('rejects %s', (_l, body) => {
    expect(parseUpdateItemBody(body).ok).toBe(false)
  })
})
