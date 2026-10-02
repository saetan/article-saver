import type { Item } from '../db/schema/types'

/** The subset of an Item the Library list needs (no bulky content or notes). */
export type ItemSummary = Pick<
  Item,
  | 'id'
  | 'type'
  | 'url'
  | 'canonicalUrl'
  | 'title'
  | 'excerpt'
  | 'siteName'
  | 'imageUrl'
  | 'status'
  | 'isFavorite'
  | 'extractionStatus'
  | 'extractionError'
  | 'createdAt'
> & {
  /** True when the user pasted text for this item (the text itself stays out of the list). */
  hasPastedText: boolean
}

export function toItemSummary(item: Item): ItemSummary {
  return {
    id: item.id,
    type: item.type,
    url: item.url,
    canonicalUrl: item.canonicalUrl,
    title: item.title,
    excerpt: item.excerpt,
    siteName: item.siteName,
    imageUrl: item.imageUrl,
    status: item.status,
    isFavorite: item.isFavorite,
    extractionStatus: item.extractionStatus,
    extractionError: item.extractionError,
    createdAt: item.createdAt,
    hasPastedText: !!item.pastedText
  }
}

/** Library list page size until filters and paging land (#18). */
export const ITEM_LIST_LIMIT = 50
