import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

/**
 * Strict allowlist for stored article HTML (ADR 0008/0011). Anything not
 * listed is dropped: no script/style/iframe/object/embed/form/input/svg/math,
 * no event handlers, no `style` attribute, no `class`/`id`.
 */
const ALLOWED_TAGS = [
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul'
]

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'datetime']

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_SRC_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Resolves `value` against `baseUrl` and returns it only when its scheme is on
 * the allowlist. This rejects `javascript:` (any case or embedded whitespace,
 * since resolution goes through the WHATWG URL parser) and `data:` URLs,
 * including `data:` images: inline data images are not needed for stored
 * articles and are a common smuggling vector.
 */
export function safeUrl(value: string, baseUrl: string, allowMailto = false): string | null {
  try {
    const url = new URL(value.trim(), baseUrl)
    const allowed = allowMailto ? SAFE_LINK_PROTOCOLS : SAFE_SRC_PROTOCOLS
    return allowed.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

let window: JSDOM['window'] | undefined

/**
 * Sanitises extracted article HTML with DOMPurify before it is stored.
 * DOMPurify needs a spec-complete DOM; linkedom lacks parts of it (it makes
 * DOMPurify silently report `isSupported: false` and pass input through
 * unchanged), so a jsdom window, which never runs scripts, hosts it. Relative URLs are made absolute against
 * `baseUrl`; links get `rel="noopener noreferrer nofollow"`.
 */
export function sanitizeArticleHtml(html: string, baseUrl: string): string {
  window ??= new JSDOM('<!doctype html><html><body></body></html>').window
  const purify = createDOMPurify(window as unknown as Parameters<typeof createDOMPurify>[0])
  // Fail closed: an unsupported DOM would return the input unsanitised.
  if (!purify.isSupported) throw new Error('DOMPurify is not supported by this DOM')

  purify.addHook('afterSanitizeAttributes', (node) => {
    for (const attr of ['href', 'src'] as const) {
      if (!node.hasAttribute(attr)) continue
      const resolved = safeUrl(node.getAttribute(attr) ?? '', baseUrl, attr === 'href')
      if (resolved) node.setAttribute(attr, resolved)
      else node.removeAttribute(attr)
    }
    if (node.hasAttribute('href')) node.setAttribute('rel', 'noopener noreferrer nofollow')
  })

  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [...ALLOWED_ATTR, 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['style']
  })
}
