import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()

  const [row] = await db
    .select({
      availableUntil: user.availableUntil,
      availableGameId: user.availableGameId
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (!row) {
    return { available: false, availableUntil: null, availableGameId: null }
  }

  const available = row.availableUntil !== null && new Date(row.availableUntil) > new Date()

  return {
    available,
    availableUntil: available ? row.availableUntil : null,
    availableGameId: available ? row.availableGameId : null
  }
})
