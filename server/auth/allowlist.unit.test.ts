import { describe, expect, it } from 'vitest'
import { parseAllowlist } from './allowlist'

describe('parseAllowlist', () => {
  it('parses a single email', () => {
    expect(parseAllowlist('me@example.com')).toEqual(['me@example.com'])
  })

  it('parses multiple comma-separated emails', () => {
    expect(parseAllowlist('a@example.com,b@example.com')).toEqual([
      'a@example.com',
      'b@example.com'
    ])
  })

  it('trims whitespace around each entry', () => {
    expect(parseAllowlist(' a@example.com , b@example.com ')).toEqual([
      'a@example.com',
      'b@example.com'
    ])
  })

  it('lower-cases every entry', () => {
    expect(parseAllowlist('Me@Example.COM')).toEqual(['me@example.com'])
  })

  it('drops empty entries from stray/trailing commas', () => {
    expect(parseAllowlist('a@example.com,,b@example.com,')).toEqual([
      'a@example.com',
      'b@example.com'
    ])
  })

  it('fails closed: undefined parses to an empty list', () => {
    expect(parseAllowlist(undefined)).toEqual([])
  })

  it('fails closed: null parses to an empty list', () => {
    expect(parseAllowlist(null)).toEqual([])
  })

  it('fails closed: empty string parses to an empty list', () => {
    expect(parseAllowlist('')).toEqual([])
  })

  it('fails closed: whitespace-only string parses to an empty list', () => {
    expect(parseAllowlist('   ')).toEqual([])
  })
})
