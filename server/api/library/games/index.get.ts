import { and, asc, desc, eq, ilike, isNotNull, sql } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../db/schema'

const SUPPORTED_PLATFORMS = ['steam', 'playstation', 'xbox'] as const
type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number]

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const query = getQuery(event)
  const platform = typeof query.platform === 'string' && (SUPPORTED_PLATFORMS as readonly string[]).includes(query.platform)
    ? query.platform as SupportedPlatform
    : undefined
  const search = typeof query.search === 'string' && query.search.trim().length > 0
    ? query.search.trim()
    : undefined
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'name'
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc'
  const limit = Math.min(parseInt(String(query.limit ?? '100'), 10) || 100, 500)
  const offset = Math.max(parseInt(String(query.offset ?? '0'), 10) || 0, 0)

  const filters = [eq(userPlatformAccounts.userId, userId)]
  if (platform) filters.push(eq(userPlatformAccounts.platform, platform))
  if (search) filters.push(ilike(userPlatformGames.name, `%${search}%`))
  if (sortBy === 'lastPlayed') filters.push(isNotNull(userPlatformGames.lastPlayed))

  const orderColumn = sortBy === 'playtime'
    ? userPlatformGames.playtimeTotal
    : sortBy === 'lastPlayed'
      ? userPlatformGames.lastPlayed
      : userPlatformGames.name
  const orderFn = sortOrder === 'desc' ? desc : asc

  // Achievement totals per game in a single subquery — Drizzle can't paginate-and-aggregate
  // in one shot otherwise.
  const achievementCounts = db
    .select({
      gameId: userPlatformAchievements.platformGameId,
      total: sql<number>`count(*)`.mapWith(Number).as('total'),
      unlocked: sql<number>`count(*) filter (where ${userPlatformAchievements.isUnlocked})`.mapWith(Number).as('unlocked')
    })
    .from(userPlatformAchievements)
    .groupBy(userPlatformAchievements.platformGameId)
    .as('ach_counts')

  const rows = await db
    .select({
      id: userPlatformGames.id,
      platformGameId: userPlatformGames.platformGameId,
      name: userPlatformGames.name,
      playtimeTotal: userPlatformGames.playtimeTotal,
      playtimeRecent: userPlatformGames.playtimeRecent,
      lastPlayed: userPlatformGames.lastPlayed,
      iconUrl: userPlatformGames.iconUrl,
      coverUrl: userPlatformGames.coverUrl,
      isCompleted: userPlatformGames.isCompleted,
      completedAt: userPlatformGames.completedAt,
      platform: userPlatformAccounts.platform,
      platformAccountId: userPlatformAccounts.id,
      totalAchievements: sql<number>`coalesce(${achievementCounts.total}, 0)`.mapWith(Number),
      unlockedAchievements: sql<number>`coalesce(${achievementCounts.unlocked}, 0)`.mapWith(Number)
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .leftJoin(achievementCounts, eq(achievementCounts.gameId, userPlatformGames.id))
    .where(and(...filters))
    .orderBy(orderFn(orderColumn))
    .limit(limit)
    .offset(offset)

  const games = rows.map(row => ({
    ...row,
    achievementPercentage: row.totalAchievements > 0
      ? Math.round((row.unlockedAchievements / row.totalAchievements) * 100)
      : 0
  }))

  return {
    success: true,
    games,
    pagination: {
      limit,
      offset,
      hasMore: rows.length === limit
    }
  }
})
