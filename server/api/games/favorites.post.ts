import { eq, and } from 'drizzle-orm'
import { userFavoritedGames, games } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const { gameId } = await readBody(event)

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  // Verify game exists
  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Jeu introuvable' })
  }

  // Check if already favorited
  const [existing] = await db
    .select()
    .from(userFavoritedGames)
    .where(
      and(
        eq(userFavoritedGames.userId, me),
        eq(userFavoritedGames.gameId, gameId)
      )
    )
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Deja en favori' })
  }

  await db.insert(userFavoritedGames).values({
    userId: me,
    gameId
  })

  return { success: true }
})
