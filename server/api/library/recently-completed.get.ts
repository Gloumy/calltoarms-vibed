import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const query = getQuery(event)
  const limit = Math.min(parseInt(String(query.limit ?? '10'), 10) || 10, 50)

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
      completedAt: userPlatformGames.completedAt,
      platform: userPlatformAccounts.platform
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(
      eq(userPlatformAccounts.userId, userId),
      eq(userPlatformGames.isCompleted, true),
      isNotNull(userPlatformGames.completedAt)
    ))
    .orderBy(desc(userPlatformGames.completedAt))
    .limit(limit)

  return { success: true, games }
})
