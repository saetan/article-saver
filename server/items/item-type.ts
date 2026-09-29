import type { ItemType } from '../db/schema/types'

const HOST_TYPES: Record<string, ItemType> = {
  'x.com': 'x_post',
  'threads.net': 'threads_post',
  'instagram.com': 'instagram_post'
}

/**
 * Detects the Item type of a URL to be saved from its host (ADR 0009).
 * Expects a *canonical* URL (`canonicalizeUrl`), which has already collapsed
 * `twitter.com`/`www.` variants onto `x.com` etc.; anything that isn't a
 * known social host is an `article`.
 */
export function detectItemType(canonicalUrl: string): ItemType {
  return HOST_TYPES[new URL(canonicalUrl).hostname] ?? 'article'
}
