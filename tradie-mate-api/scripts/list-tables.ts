import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const rows = await sql.unsafe(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  )
  console.log(JSON.stringify(rows.map((r) => r.table_name), null, 2))
  await sql.end()
}

main().catch((err) => {
  console.error('DB error:', (err as Error).message)
  process.exit(1)
})
