import { describe, expect, it } from 'vitest'
import { isBlockedIp, isIpLiteral, stripBrackets } from './ip-classify'

describe('isBlockedIp', () => {
  it.each([
    ['127.0.0.1', 'IPv4 loopback'],
    ['127.1', 'IPv4 loopback (short form, normalised by URL parser)'],
    ['10.0.0.1', 'RFC1918 10/8'],
    ['172.16.0.1', 'RFC1918 172.16/12'],
    ['172.31.255.255', 'RFC1918 172.16/12 upper bound'],
    ['192.168.1.1', 'RFC1918 192.168/16'],
    ['169.254.169.254', 'link-local / cloud metadata address'],
    ['169.254.1.1', 'link-local 169.254/16'],
    ['100.64.0.1', 'CGNAT 100.64/10'],
    ['100.127.255.255', 'CGNAT 100.64/10 upper bound'],
    ['0.0.0.0', '0.0.0.0/8'],
    ['0.1.2.3', '0.0.0.0/8 range'],
    ['255.255.255.255', 'broadcast'],
    ['224.0.0.1', 'multicast'],
    ['192.0.2.1', 'documentation TEST-NET-1'],
    ['198.51.100.1', 'documentation TEST-NET-2'],
    ['203.0.113.1', 'documentation TEST-NET-3'],
    ['198.18.0.1', 'benchmarking range'],
    ['240.0.0.1', 'reserved 240/4'],
    ['::1', 'IPv6 loopback'],
    ['::', 'IPv6 unspecified'],
    ['fe80::1', 'IPv6 link-local'],
    ['fc00::1', 'IPv6 unique local (ULA)'],
    ['fd00::1', 'IPv6 unique local (ULA), fd prefix'],
    ['fd00:ec2::254', 'AWS IMDSv6 address'],
    ['ff02::1', 'IPv6 multicast'],
    ['::ffff:127.0.0.1', 'IPv4-mapped IPv6 loopback'],
    ['::ffff:10.0.0.1', 'IPv4-mapped IPv6 private'],
    ['::ffff:169.254.169.254', 'IPv4-mapped IPv6 metadata address'],
    ['64:ff9b::7f00:1', 'NAT64 wrapping loopback (127.0.0.1)'],
    ['64:ff9b::a00:1', 'NAT64 wrapping private (10.0.0.1)'],
    ['2001::1', 'Teredo tunnelling'],
    ['2002::1', '6to4 tunnelling']
  ])('blocks %s (%s)', (address) => {
    expect(isBlockedIp(address)).toBe(true)
  })

  it.each([
    ['8.8.8.8', 'public IPv4'],
    ['1.1.1.1', 'public IPv4'],
    ['2606:4700:4700::1111', 'public IPv6'],
    ['::ffff:8.8.8.8', 'IPv4-mapped IPv6 public address']
  ])('allows %s (%s)', (address) => {
    expect(isBlockedIp(address)).toBe(false)
  })
})

describe('isIpLiteral', () => {
  it('recognises IPv4 literals', () => {
    expect(isIpLiteral('127.0.0.1')).toBe(true)
  })

  it('recognises IPv6 literals', () => {
    expect(isIpLiteral('::1')).toBe(true)
  })

  it('rejects hostnames', () => {
    expect(isIpLiteral('example.com')).toBe(false)
  })
})

describe('stripBrackets', () => {
  it('removes brackets from a bracketed IPv6 host', () => {
    expect(stripBrackets('[::1]')).toBe('::1')
  })

  it('leaves an unbracketed host untouched', () => {
    expect(stripBrackets('example.com')).toBe('example.com')
  })
})
