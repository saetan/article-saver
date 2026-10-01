import { clerkFrontendApiProxy } from '@clerk/backend/proxy'
import { createError, defineEventHandler, getRequestURL, toWebRequest } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  CLERK_PROXY_PATH,
  isClerkProxyPath,
  isProductionPublishableKey
} from '../../../auth/clerk-proxy'
import { resolveExpectedOrigin } from '../../../auth/csrf'

/**
 * Proxies Clerk's Frontend API through the app at `/api/__clerk`, the path
 * Replit-managed Clerk expects for published apps (the production Frontend
 * API host has no usable TLS certificate of its own).
 *
 * `00.clerk.ts`, `01.auth.ts` and `02.csrf.ts` let exactly this path (and
 * its descendants) through; every other `/api/**` path stays protected.
 * The browser never sees the secret key: it is only attached to the
 * upstream request inside `clerkFrontendApiProxy`.
 *
 * Clerk derives the proxy URL (`Clerk-Proxy-Url`) and instance host from the
 * forwarded headers, so they are pinned to the app's public origin
 * (`NUXT_PUBLIC_APP_ORIGIN`, else the Replit edge's `X-Forwarded-*`) instead
 * of whatever internal host the edge hands the container.
 *
 * Production instance only: Clerk proxies don't work for development
 * instances, so with a development key this route does not exist.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clerk = (config.clerk ?? {}) as { secretKey?: string }
  const publicClerk = (config.public?.clerk ?? {}) as { publishableKey?: string }
  const publishableKey = publicClerk.publishableKey || process.env.CLERK_PUBLISHABLE_KEY
  const secretKey = clerk.secretKey || process.env.CLERK_SECRET_KEY

  if (!isProductionPublishableKey(publishableKey)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Reject traversal / encoded / malformed paths outright rather than
  // forwarding something other than what was routed here.
  const rawPath = event.path.split(/[?#]/)[0] ?? ''
  if (!isClerkProxyPath(rawPath) || /%|\/\/|\/\.\.?(\/|$)/.test(rawPath)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const publicOrigin = new URL(
    resolveExpectedOrigin(
      process.env.NUXT_PUBLIC_APP_ORIGIN,
      getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
    )
  )
  const incoming = toWebRequest(event)
  const incomingUrl = new URL(incoming.url)

  const headers = new Headers(incoming.headers)
  headers.set('x-forwarded-host', publicOrigin.host)
  headers.set('x-forwarded-proto', publicOrigin.protocol.replace(':', ''))

  const hasBody = incoming.body !== null
  const request = new Request(
    `${publicOrigin.origin}${incomingUrl.pathname}${incomingUrl.search}`,
    {
      method: incoming.method,
      headers,
      ...(hasBody ? { body: incoming.body, duplex: 'half' } : {})
    } as RequestInit
  )

  return clerkFrontendApiProxy(request, {
    proxyPath: CLERK_PROXY_PATH,
    publishableKey,
    secretKey
  })
})
