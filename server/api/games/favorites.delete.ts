import { eq, and } from 'drizzle-orm'
import { userFavoritedGames } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const { gameId } = await readBody(event)

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  const deleted = await db
    .delete(userFavoritedGames)
    .where(
      and(
        eq(userFavoritedGames.userId, me),
        eq(userFavoritedGames.gameId, gameId)
      )
    )
    .returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Favori introuvable' })
  }

  return { success: true }
})
