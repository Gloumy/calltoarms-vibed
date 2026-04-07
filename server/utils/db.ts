import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../db/schema'

const pool = new pg.Pool({
  connectionString: useRuntimeConfig().databaseUrl
})

export const db = drizzle(pool, { schema })
