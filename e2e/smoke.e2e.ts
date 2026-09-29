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

test('signed in (allowlisted): empty Library and /api/me returns 200', async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
  await page.goto('/')

  await expect(page.getByText('Your library is empty')).toBeVisible()

  const me = await page.request.get('/api/me')
  expect(me.status()).toBe(200)
})
