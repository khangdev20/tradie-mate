import 'dotenv/config'
import twilio from 'twilio'

const to = process.argv[2]

if (!to) {
  console.error('Usage: npm run twilio:test -- +614XXXXXXXX')
  process.exit(1)
}

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const from = process.env.TWILIO_FROM_NUMBER

if (!accountSid || !authToken || !from) {
  console.error('Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER')
  process.exit(1)
}

const client = twilio(accountSid, authToken)

async function main() {
  const message = await client.messages.create({
    body: 'TradieMate test SMS',
    from,
    to,
  })

  console.log('SMS sent.')
  console.log('SID:', message.sid)
  console.log('Status:', message.status)
}

main().catch((err) => {
  console.error('Twilio error:', (err as Error).message)
  process.exit(1)
})
