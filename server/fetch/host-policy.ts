import dns from 'node:dns'
import type { LookupAddress, LookupOptions } from 'node:dns'
import type { LookupFunction } from 'node:net'
import { isBlockedIp, isIpLiteral, stripBrackets } from './ip-classify'
import { BlockedUrlError } from './errors'

export interface HostPolicyOptions {
  /**
   * TEST-ONLY escape hatch so the e2e stub HTTP server (which necessarily
   * runs on loopback) can be fetched in tests without disabling SSRF
   * protection everywhere.
   *
   * This list is only ever consulted when `process.env.NODE_ENV === 'test'`
   * - in any other environment it is silently ignored, so it can never be
   * enabled by accident in production. A comma-separated
   * `SAFE_FETCH_ALLOW_HOSTS` env var works the same way and is merged in.
   *
   * Matching is by exact hostname (as it appears in the URL / DNS
   * question), not by resolved IP - e.g. `["localhost"]` or `["127.0.0.1"]`.
   */
  allowHosts?: string[]
}

function testAllowedHosts(opts: HostPolicyOptions): Set<string> {
  if (process.env.NODE_ENV !== 'test') return new Set()

  const fromOpts = opts.allowHosts ?? []
  const fromEnv = (process.env.SAFE_FETCH_ALLOW_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

  return new Set([...fromOpts, ...fromEnv])
}

/** True when `hostname` is explicitly allowlisted via the test-only override. */
export function isTestOverrideHost(hostname: string, opts: HostPolicyOptions): boolean {
  return testAllowedHosts(opts).has(hostname)
}

/**
 * Fast-path validation for URLs whose host is already a literal IP address
 * (`http://127.0.0.1/`, `http://[::1]/`, or a numeric form the WHATWG URL
 * parser normalised to one, e.g. `http://2130706433/` -> `127.0.0.1`).
 *
 * This matters because Node's `net.connect` only invokes a custom
 * `lookup()` when the host needs resolving - a literal IP is used directly,
 * so it never passes through {@link createSafeLookup}. We must therefore
 * reject blocked IP literals before ever attempting to connect.
 */
export function assertHostAllowedIfLiteral(
  url: string,
  hostname: string,
  opts: HostPolicyOptions
): void {
  const host = stripBrackets(hostname)
  if (!isIpLiteral(host)) return
  if (isTestOverrideHost(hostname, opts)) return
  if (isBlockedIp(host)) {
    throw new BlockedUrlError(`Blocked ${url}: ${host} is not a publicly routable address`)
  }
}

function numericFamily(family: LookupOptions['family']): number {
  if (family === 'IPv4') return 4
  if (family === 'IPv6') return 6
  return family ?? 0
}

/**
 * `isBlockedIp` calls `ipaddr.parse`, which throws on anything it can't
 * parse. That's fine when we control the input (an already-validated URL
 * hostname), but addresses here come back from the OS resolver - if it ever
 * returns something unparseable (a malformed scope id, a resolver bug,
 * etc.), a bare throw would escape the `dns.lookup` callback below as an
 * uncaught exception instead of surfacing as a normal `callback(err)`. We
 * default-deny: treat "can't tell if it's safe" the same as "not safe".
 */
function isBlockedIpSafe(address: string): boolean {
  try {
    return isBlockedIp(address)
  } catch {
    return true
  }
}

/**
 * Builds a `dns.lookup`-compatible function to pass as an undici
 * `Agent`'s `connect.lookup` option.
 *
 * This is the piece that closes the DNS-rebinding TOCTOU gap: resolution
 * and validation happen in the same call that Node's networking stack uses
 * to obtain the address it then connects to, and only addresses that pass
 * {@link isBlockedIp} are ever handed back - an attacker-controlled DNS
 * server can't validate-then-swap because there is no separate "validate"
 * step to race against. Node still sets the TLS SNI / HTTP Host header from
 * the original hostname (unaffected by the resolved IP), so HTTPS and
 * virtual-hosted HTTP keep working normally.
 *
 * When a hostname resolves to a mix of public and non-public addresses, the
 * non-public ones are silently dropped and only the validated addresses are
 * used to connect - the whole host is blocked only if *none* of its
 * addresses are publicly routable.
 */
export function createSafeLookup(url: string, opts: HostPolicyOptions): LookupFunction {
  return function safeLookup(hostname, lookupOptions, callback) {
    const bypass = isTestOverrideHost(hostname, opts)

    dns.lookup(
      hostname,
      { all: true, family: numericFamily(lookupOptions?.family) },
      (err, addresses) => {
        if (err) {
          callback(err, '', 0)
          return
        }

        const resolved = addresses as unknown as LookupAddress[]
        const allowed = bypass
          ? resolved
          : resolved.filter((candidate) => !isBlockedIpSafe(candidate.address))

        if (allowed.length === 0) {
          callback(
            new BlockedUrlError(
              `Blocked ${url}: ${hostname} resolved only to non-public addresses`
            ),
            '',
            0
          )
          return
        }

        if (lookupOptions?.all) {
          callback(null, allowed, undefined)
          return
        }

        const pick = allowed[0] as LookupAddress
        callback(null, pick.address, pick.family)
      }
    )
  }
}
