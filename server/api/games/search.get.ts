import { ilike } from 'drizzle-orm'
import { games } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = useDB()
  const { q } = getQuery(event)

  if (!q || String(q).length < 2) return []

  const query = String(q)

  // Search local DB and IGDB in parallel
  const [local, igdbResults] = await Promise.all([
    db.select().from(games).where(ilike(games.name, `%${query}%`)).limit(5),
    searchIGDB(query).catch(() => [])
  ])

  const localIds = new Set(local.map(g => g.id))
  const newFromIgdb = igdbResults.filter((g: any) => !localIds.has(g.id))

  // Persist new IGDB results to local DB
  if (newFromIgdb.length > 0) {
    await db.insert(games).values(newFromIgdb).onConflictDoNothing()
  }

  return [...local, ...newFromIgdb]
})
