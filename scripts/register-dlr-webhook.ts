/**
 * Re-register the DLR webhook URL with HostPinnacle.
 *
 * Usage:
 *   npx tsx scripts/register-dlr-webhook.ts
 *
 * Requires MONGODB_URI, NEXT_PUBLIC_BASE_URL, and HostPinnacle credentials in DB or env.
 */

import 'dotenv/config'
import { registerDlrWebhook } from '../lib/services/hostpinnacle/register-dlr-webhook'

async function main() {
  console.log('Registering DLR webhook with HostPinnacle...\n')

  try {
    const result = await registerDlrWebhook()

    console.log('DLR URL:', result.dlrUrl)
    console.log('Secret in URL:', result.hasSecret ? 'yes' : 'no')

    if (result.success) {
      console.log('\nSuccess:', result.message)
      process.exit(0)
    }

    console.error('\nFailed:', result.error)
    if (result.message) console.error('HostPinnacle:', result.message)
    process.exit(1)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error:', message)
    process.exit(1)
  }
}

main()
