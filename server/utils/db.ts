import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../db/schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDB() {
  if (!_db) {
    const pool = new pg.Pool({
      connectionString: useRuntimeConfig().databaseUrl
    })
    _db = drizzle(pool, { schema })
  }
  return _db
}
