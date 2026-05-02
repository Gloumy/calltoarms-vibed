import { and, desc, eq, gt } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../db/schema'

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const query = getQuery(event)
  const limit = Math.min(parseInt(String(query.limit ?? '10'), 10) || 10, 50)

  const cutoff = new Date(Date.now() - ONE_YEAR_MS)

  const games = await db
    .select({
      id: userPlatformGames.id,
      platformGameId: userPlatformGames.platformGameId,
      name: userPlatformGames.name,
      iconUrl: userPlatformGames.iconUrl,
      coverUrl: userPlatformGames.coverUrl,
      playtimeTotal: userPlatformGames.playtimeTotal,
      lastPlayed: userPlatformGames.lastPlayed,
      isCompleted: userPlatformGames.isCompleted,
      platform: userPlatformAccounts.platform
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(eq(userPlatformAccounts.userId, userId), gt(userPlatformGames.lastPlayed, cutoff)))
    .orderBy(desc(userPlatformGames.lastPlayed))
    .limit(limit)

  return { success: true, games }
})
