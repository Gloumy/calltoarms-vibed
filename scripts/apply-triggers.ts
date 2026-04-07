import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 'dotenv/config'

const client = new pg.Client({ connectionString: process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL })

async function main() {
  await client.connect()
  const sql = readFileSync(resolve(import.meta.dirname!, '../server/db/migrations/0001_triggers_listen_notify.sql'), 'utf-8')
  await client.query(sql)
  console.log('Triggers LISTEN/NOTIFY applied successfully')
  await client.end()
}

main().catch((err) => {
  console.error('Failed to apply triggers:', err)
  process.exit(1)
})
