// Local stand-in for the external internet during e2e (ADR 0012). Run
// directly (`node e2e/stub-server/index.ts`) or import `createStubServer`.
import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

export const STUB_PATHS = {
  article: '/article',
  ogOnly: '/og-only',
  xOembed: '/x/oembed'
} as const

/** Creates (does not start) the stub server, which serves fixtures from `./fixtures`. */
export function createStubServer(): Server {
  return createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')

    if (pathname === STUB_PATHS.article) {
      res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(fixture('article.html'))
    } else if (pathname === STUB_PATHS.ogOnly) {
      res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(fixture('og-only.html'))
    } else if (pathname === STUB_PATHS.xOembed) {
      res
        .writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        .end(fixture('x-oembed.json'))
    } else if (pathname === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('ok')
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
    }
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.E2E_STUB_PORT ?? 4010)
  createStubServer().listen(port, 'localhost', () => {
    console.log(`stub server listening on http://localhost:${port}`)
  })
}
