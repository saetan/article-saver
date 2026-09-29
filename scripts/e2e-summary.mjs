// Turns Playwright's JSON reporter output into a Markdown table for the
// GitHub Actions job summary. Usage:
//   node scripts/e2e-summary.mjs <results.json> [artifact-name] >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ICONS = { passed: 'PASS', failed: 'FAIL', flaky: 'FLAKY', skipped: 'SKIP' }

function collectSpecs(suite, titles = [], out = []) {
  const path = suite.title && !suite.file ? [...titles, suite.title] : titles
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? []
      const status =
        test.status === 'skipped'
          ? 'skipped'
          : test.status === 'flaky'
            ? 'flaky'
            : test.status === 'unexpected'
              ? 'failed'
              : 'passed'
      out.push({
        title: [...path, spec.title].join(' > '),
        status,
        duration: results.reduce((sum, r) => sum + (r.duration ?? 0), 0)
      })
    }
  }
  for (const child of suite.suites ?? []) collectSpecs(child, path, out)
  return out
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`

export function buildSummary(report, { artifactName } = {}) {
  const rows = (report.suites ?? []).flatMap((s) => collectSpecs(s))
  const count = (status) => rows.filter((r) => r.status === status).length
  const total = rows.reduce((sum, r) => sum + r.duration, 0)

  const lines = ['## End-to-end results', '']
  if (rows.length === 0) {
    lines.push('No tests were reported.')
  } else {
    lines.push('| Test | Status | Duration |', '| --- | --- | --- |')
    for (const r of rows) {
      lines.push(`| ${cell(r.title)} | ${ICONS[r.status]} | ${seconds(r.duration)} |`)
    }
    lines.push(
      '',
      `**Total:** ${rows.length} tests, ${count('passed')} passed, ${count('failed')} failed, ` +
        `${count('flaky')} flaky, ${count('skipped')} skipped in ${seconds(total)}`
    )
  }
  if (artifactName) {
    lines.push(
      '',
      `The HTML report and screenshots are in the **${artifactName}** artifact (see Artifacts below).`
    )
  }
  return lines.join('\n') + '\n'
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, artifactName] = process.argv.slice(2)
  if (!file) {
    console.error('usage: e2e-summary.mjs <results.json> [artifact-name]')
    process.exit(2)
  }
  let report
  try {
    report = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    process.stdout.write(
      `## End-to-end results\n\nNo JSON results were produced (${error.code ?? 'unreadable'}); the run likely failed before tests started.\n`
    )
    process.exit(0)
  }
  process.stdout.write(buildSummary(report, { artifactName }))
}
