import ipaddr from 'ipaddr.js'

/**
 * Classifies a literal IP address (never a hostname) as blocked for
 * server-initiated outbound fetches.
 *
 * We default-deny: ipaddr.js buckets every address into a named range, and
 * we only allow `unicast` (globally routable) addresses through. Everything
 * else - loopback (127.0.0.0/8, ::1), RFC1918 private space, IPv6 unique
 * local (fc00::/7, which covers the AWS IMDSv6 address fd00:ec2::254),
 * link-local (169.254.0.0/16, which covers the cloud metadata address
 * 169.254.169.254, and fe80::/10), CGNAT (100.64.0.0/10), 0.0.0.0/8,
 * multicast, broadcast, and the reserved/documentation ranges - is blocked.
 *
 * IPv4-mapped IPv6 addresses (`::ffff:a.b.c.d`) are unwrapped first and the
 * embedded IPv4 address is classified instead, so `::ffff:127.0.0.1` is
 * blocked (embeds a loopback address) without blanket-blocking every mapped
 * address regardless of what it embeds.
 *
 * IPv6 tunnelling/translation forms we do not unwrap - 6to4 (2002::/16),
 * Teredo (2001::/32), and NAT64 (64:ff9b::/96, which can wrap a private
 * IPv4 address such as ::ffff:0.0.0.0's RFC6052 equivalent) - fall through
 * to the default deny, since we cannot cheaply prove what they resolve to
 * on the wire.
 */
export function isBlockedIp(address: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6 = ipaddr.parse(address)

  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address()
    }
  }

  return addr.range() !== 'unicast'
}

/** True when `host` is a literal IPv4 or IPv6 address rather than a hostname. */
export function isIpLiteral(host: string): boolean {
  return ipaddr.isValid(host)
}

/** Strips the `[` `]` brackets `URL#hostname` puts around IPv6 literals. */
export function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}
