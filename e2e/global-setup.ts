import { clerkSetup } from '@clerk/testing/playwright'
import { loadE2eEnv } from './env'

export default async function globalSetup() {
  loadE2eEnv()
  await clerkSetup()
}
