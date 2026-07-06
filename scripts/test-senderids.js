/**
 * Test script to fetch sender IDs from HostPinnacle
 * Run with: node scripts/test-senderids.js
 */

require('dotenv').config({ path: '.env.local' })

const HOSTPINNACLE_BASE_URL = process.env.HOSTPINNACLE_BASE_URL || 'https://smsportal.hostpinnacle.co.ke'
const HOSTPINNACLE_USERID = process.env.HOSTPINNACLE_USERID
const HOSTPINNACLE_PASSWORD = process.env.HOSTPINNACLE_PASSWORD

async function testSenderIds() {
  console.log('Testing HostPinnacle Sender ID API...')
  console.log('Base URL:', HOSTPINNACLE_BASE_URL)
  console.log('User ID:', HOSTPINNACLE_USERID)
  console.log('Has Password:', !!HOSTPINNACLE_PASSWORD)
  console.log('')

  const url = `${HOSTPINNACLE_BASE_URL}/SMSApi/senderid/read`
  
  // Build form data
  const formData = new URLSearchParams()
  formData.append('userid', HOSTPINNACLE_USERID)
  formData.append('password', HOSTPINNACLE_PASSWORD)
  formData.append('output', 'json')

  console.log('Request URL:', url)
  console.log('Request body:', formData.toString())
  console.log('')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('')

    const text = await response.text()
    console.log('Raw response text:')
    console.log(text)
    console.log('')

    try {
      const json = JSON.parse(text)
      console.log('Parsed JSON:')
      console.log(JSON.stringify(json, null, 2))
    } catch (e) {
      console.log('Failed to parse as JSON:', e.message)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testSenderIds()

