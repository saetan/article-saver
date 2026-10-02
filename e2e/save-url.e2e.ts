import { mkdirSync } from 'node:fs'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'

test('save a URL, see it listed with a status badge, and get "Already saved" on a repeat', async ({
  page
}) => {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
  await page.goto('/')

  // Unique per run, in case the database is ever reused.
  const url = `https://example.com/e2e-save-${Date.now()}`
  const input = page.getByPlaceholder('https://example.com/article')

  await input.fill(url)
  await page.getByRole('button', { name: 'Save' }).click()

  const row = page.getByRole('listitem').filter({ hasText: url })
  await expect(row).toBeVisible()
  // Depending on timing (and whether example.com is reachable) the job is
  // Extracting, Saved or Failed. Either way a status badge is rendered.
  await expect(row.getByText(/Extracting|Failed|Saved/)).toBeVisible()

  await input.fill(url)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/Already saved on /)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open it' })).toBeVisible()

  mkdirSync('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/save-url-library.png', fullPage: true })
})
