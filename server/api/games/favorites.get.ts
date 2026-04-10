import { eq } from 'drizzle-orm'
import { userFavoritedGames, games } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()

  const rows = await db
    .select({
      gameId: userFavoritedGames.gameId,
      createdAt: userFavoritedGames.createdAt,
      id: games.id,
      name: games.name,
      slug: games.slug,
      coverUrl: games.coverUrl,
      summary: games.summary,
      genres: games.genres,
      platforms: games.platforms,
      firstReleaseDate: games.firstReleaseDate
    })
    .from(userFavoritedGames)
    .innerJoin(games, eq(games.id, userFavoritedGames.gameId))
    .where(eq(userFavoritedGames.userId, session.user.id))

  return rows
})
