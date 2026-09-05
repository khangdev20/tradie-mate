import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@tradiemate.com',
    password: 'Password123!',
  })

  if (error || !data.session) {
    throw new Error(error?.message || 'no session')
  }

  const token = data.session.access_token

  const res = await fetch('http://127.0.0.1:3000/jobs', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = await res.text()
  console.log('GET /jobs STATUS', res.status)
  console.log('GET /jobs BODY', body.slice(0, 300))

  const createRes = await fetch('http://127.0.0.1:3000/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Test Job via auth flow',
      address: '1 Test St, Brisbane QLD 4000',
    }),
  })

  const createBody = await createRes.text()
  console.log('POST /jobs STATUS', createRes.status)
  console.log('POST /jobs BODY', createBody.slice(0, 300))
}

main().catch((err) => {
  console.error('ERR', (err as Error).message)
  process.exit(1)
})
