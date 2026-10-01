import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'

test('GET /api/health returns 200', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ ok: true })
})

test('signed out: / redirects to /sign-in', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in/)
})

test('signed out: /sign-up is reachable without redirecting to /sign-in', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-up')
  await expect(page).toHaveURL(/\/sign-up/)
})

test('signed in (allowlisted): Library loads and /api/me returns 200', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
  await page.goto('/')

  // Not asserting an empty Library: other e2e files share the database.
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
  await expect(page.getByPlaceholder('https://example.com/article')).toBeVisible()

  const me = await page.request.get('/api/me')
  expect(me.status()).toBe(200)
})
