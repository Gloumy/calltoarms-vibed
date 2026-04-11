import { eq } from 'drizzle-orm'
import { games, userFavoritedGames } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDB()

  const { gameId } = await readBody(event)

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  // Remove favorites first
  await db.delete(userFavoritedGames).where(eq(userFavoritedGames.gameId, gameId))
  await db.delete(games).where(eq(games.id, gameId))

  return { success: true }
})
