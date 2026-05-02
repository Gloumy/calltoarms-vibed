import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../../db/schema'

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()

  const [account] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, session.user.id), eq(userPlatformAccounts.platform, 'steam')))
    .limit(1)

  if (!account) {
    return { success: true, account: null, games: [] }
  }

  const query = getQuery(event)
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : undefined
  const sortOrder = typeof query.sortOrder === 'string' ? query.sortOrder : undefined

  const games = await db
    .select()
    .from(userPlatformGames)
    .where(eq(userPlatformGames.platformAccountId, account.id))
    .orderBy(...gamesOrderBy(sortBy, sortOrder))

  const totalPlaytime = games.reduce((sum, g) => sum + g.playtimeTotal, 0)
  const recentlyPlayed = games.filter(g => g.lastPlayed && g.lastPlayed.getTime() > Date.now() - TWO_WEEKS_MS).length

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
