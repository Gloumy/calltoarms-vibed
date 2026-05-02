import { and, asc, desc, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../../db/schema'

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const [account] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'xbox')))
    .limit(1)

  if (!account) {
    return { success: true, account: null, games: [] }
  }

  const games = await db
    .select({
      id: userPlatformGames.id,
      platformGameId: userPlatformGames.platformGameId,
      name: userPlatformGames.name,
      playtimeTotal: userPlatformGames.playtimeTotal,
      playtimeRecent: userPlatformGames.playtimeRecent,
      lastPlayed: userPlatformGames.lastPlayed,
      iconUrl: userPlatformGames.iconUrl,
      coverUrl: userPlatformGames.coverUrl
    })
    .from(userPlatformGames)
    .where(eq(userPlatformGames.platformAccountId, account.id))
    .orderBy(desc(userPlatformGames.playtimeTotal), asc(userPlatformGames.name))

  const totalPlaytime = games.reduce((sum, game) => sum + game.playtimeTotal, 0)
  const cutoff = Date.now() - TWO_WEEKS_MS
  const recentlyPlayed = games.filter(game => game.lastPlayed && game.lastPlayed.getTime() > cutoff).length

  return {
    success: true,
    account: {
      id: account.id,
      platformId: account.platformId,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      profileUrl: account.profileUrl,
      lastSync: account.lastSync
    },
    games,
    stats: {
      totalGames: games.length,
      totalPlaytime,
      recentlyPlayed
    }
  }
})
