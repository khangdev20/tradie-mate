import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 10,
})

async function main() {
  const rows = await sql.unsafe(
    "select current_database() as db, current_setting('server_version') as ver",
  )
  console.log(JSON.stringify(rows))
  await sql.end()
}

main().catch((err) => {
  console.error('DB error:', (err as Error).message)
  process.exit(1)
})
