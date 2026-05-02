import { and, desc, eq, gt, gte } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../db/schema'

const PERIODS = ['all', '1y', '6m', '3m'] as const
type Period = typeof PERIODS[number]

function periodCutoff(period: Period): Date | undefined {
  const now = new Date()
  switch (period) {
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    default: return undefined
  }
}

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const query = getQuery(event)
  const period = (PERIODS as readonly string[]).includes(String(query.period))
    ? (query.period as Period)
    : 'all'
  const limit = Math.min(parseInt(String(query.limit ?? '10'), 10) || 10, 50)

  const filters = [
    eq(userPlatformAccounts.userId, userId),
    eq(userPlatformAccounts.isActive, true),
    gt(userPlatformGames.playtimeTotal, 0)
  ]
  const cutoff = periodCutoff(period)
  if (cutoff) filters.push(gte(userPlatformGames.lastPlayed, cutoff))

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
    .where(and(...filters))
    .orderBy(desc(userPlatformGames.playtimeTotal))
    .limit(limit)

  return { success: true, period, games }
})
