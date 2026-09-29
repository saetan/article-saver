import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, createRouter, eventHandler, toWebHandler } from 'h3'
import type { DbContext } from '../db/client'
import { createIntegrationDbContext } from '../db/testing/dialect'
import { createItemRepository } from '../repositories/item-repository'
import { createJobRepository } from '../repositories/job-repository'

let ctx: DbContext

// The handlers reach the database through `useDb()`; point it at the
// integration context for whichever dialect TEST_DIALECT selects.
vi.mock('../utils/db', () => ({ useDb: async () => ctx }))

const { default: postItem } = await import('./items.post')
const { default: listItems } = await import('./items.get')
const { default: getItem } = await import('./items/[id].get')

const app = createApp()
// Stand-in for 00.clerk/01.auth: the test user comes from a header.
app.use(
  eventHandler((event) => {
    const userId = event.node.req.headers['x-test-user']
    if (typeof userId === 'string') event.context.userId = userId
  })
)
const router = createRouter()
router.post('/api/items', postItem)
router.get('/api/items', listItems)
router.get('/api/items/:id', getItem)
app.use(router)
const handle = toWebHandler(app)

function call(user: string | null, method: string, path: string, body?: unknown) {
  return handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(user ? { 'x-test-user': user } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  )
}

describe('items API', () => {
  beforeEach(async () => {
    ctx = await createIntegrationDbContext()
  })

  it('POST creates a pending item, enqueues an extract job, returns 201', async () => {
    const res = await call('user-1', 'POST', '/api/items', {
      url: 'http://Example.com/post/?utm_source=x#top'
    })

    expect(res.status).toBe(201)
    const item = await res.json()
    expect(item).toMatchObject({
      type: 'article',
      userId: 'user-1',
      canonicalUrl: 'https://example.com/post',
      extractionStatus: 'pending'
    })
    const jobs = await (await createJobRepository(ctx)).listPending('user-1')
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ itemId: item.id, type: 'extract', status: 'pending' })
  })

  it('detects the item type from the host', async () => {
    const res = await call('user-1', 'POST', '/api/items', {
      url: 'https://twitter.com/jack/status/20?s=20'
    })
    expect((await res.json()).type).toBe('x_post')
  })

  it('ignores extra body fields, taking userId only from the session', async () => {
    const res = await call('user-1', 'POST', '/api/items', {
      url: 'https://example.com/a',
      userId: 'attacker',
      extractionStatus: 'succeeded',
      status: 'archived'
    })
    expect(res.status).toBe(201)
    const item = await res.json()
    expect(item).toMatchObject({ userId: 'user-1', extractionStatus: 'pending', status: 'unread' })
    expect(await (await createItemRepository(ctx)).list('attacker')).toHaveLength(0)
  })

  it('POST of a duplicate returns 409 with existingItemId and savedAt, and saves nothing new', async () => {
    const first = await (
      await call('user-1', 'POST', '/api/items', { url: 'https://example.com/a' })
    ).json()

    const dup = await call('user-1', 'POST', '/api/items', {
      url: 'http://example.com/a/?utm_medium=z#frag'
    })
    expect(dup.status).toBe(409)
    expect(await dup.json()).toEqual({ existingItemId: first.id, savedAt: first.createdAt })
    expect(await (await createItemRepository(ctx)).list('user-1')).toHaveLength(1)
    expect(await (await createJobRepository(ctx)).listPending('user-1')).toHaveLength(1)
  })

  it('returns the same 409 when create races a concurrent save', async () => {
    const [a, b] = await Promise.all([
      call('user-1', 'POST', '/api/items', { url: 'https://example.com/race' }),
      call('user-1', 'POST', '/api/items', { url: 'https://example.com/race' })
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    const loser = a.status === 409 ? a : b
    expect(Object.keys(await loser.json()).sort()).toEqual(['existingItemId', 'savedAt'])
    expect(await (await createJobRepository(ctx)).listPending('user-1')).toHaveLength(1)
  })

  it('the same URL saved by two users is not a duplicate', async () => {
    expect(
      (await call('user-1', 'POST', '/api/items', { url: 'https://example.com/a' })).status
    ).toBe(201)
    expect(
      (await call('user-2', 'POST', '/api/items', { url: 'https://example.com/a' })).status
    ).toBe(201)
  })

  it.each([
    ['not a url', { url: 'not a url' }],
    ['non-http scheme', { url: 'javascript:alert(1)' }],
    ['ftp', { url: 'ftp://example.com/file' }],
    ['missing url', {}],
    ['non-string url', { url: 5 }]
  ])('POST with %s returns 400', async (_label, body) => {
    const res = await call('user-1', 'POST', '/api/items', body)
    expect(res.status).toBe(400)
    expect(await (await createItemRepository(ctx)).list('user-1')).toHaveLength(0)
  })

  it('POST without a session is 401', async () => {
    const res = await call(null, 'POST', '/api/items', { url: 'https://example.com/a' })
    expect(res.status).toBe(401)
  })

  it("GET lists only the caller's items, newest first, max 50", async () => {
    const repo = await createItemRepository(ctx)
    for (let i = 0; i < 52; i++) {
      await repo.create('user-1', {
        type: 'article',
        url: `https://a.test/${i}`,
        canonicalUrl: `https://a.test/${i}`
      })
    }
    await repo.create('user-2', {
      type: 'article',
      url: 'https://b.test',
      canonicalUrl: 'https://b.test'
    })

    const list = await (await call('user-1', 'GET', '/api/items')).json()

    expect(list).toHaveLength(50)
    expect(
      list.every((i: { canonicalUrl: string }) => i.canonicalUrl.startsWith('https://a.test'))
    ).toBe(true)
    const times = list.map((i: { createdAt: string }) => Date.parse(i.createdAt))
    expect(times).toEqual([...times].sort((x, y) => y - x))
    expect(list[0]).not.toHaveProperty('contentHtml')
  })

  it('GET /:id returns own item and 404s another user’s (and unknown ids)', async () => {
    const created = await (
      await call('user-1', 'POST', '/api/items', { url: 'https://example.com/a' })
    ).json()

    const own = await call('user-1', 'GET', `/api/items/${created.id}`)
    expect(own.status).toBe(200)
    expect((await own.json()).id).toBe(created.id)

    expect((await call('user-2', 'GET', `/api/items/${created.id}`)).status).toBe(404)
    expect((await call('user-1', 'GET', '/api/items/nope')).status).toBe(404)
  })
})
