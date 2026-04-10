import { asc } from 'drizzle-orm'
import { games } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = useDB()

  const rows = await db
    .select()
    .from(games)
    .orderBy(asc(games.name))

  return rows
})
