import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../../db/schema'
import { requireFriendship } from '../../../../utils/library'

const SUPPORTED_PLATFORMS = ['steam', 'playstation', 'xbox'] as const
type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number]

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const friendId = getRouterParam(event, 'friendId')
  if (!friendId) {
    throw createError({ statusCode: 400, statusMessage: 'friendId manquant' })
  }
  await requireFriendship(userId, friendId)

  const query = getQuery(event)
  const platform = typeof query.platform === 'string' && (SUPPORTED_PLATFORMS as readonly string[]).includes(query.platform)
    ? query.platform as SupportedPlatform
    : undefined
  const search = typeof query.search === 'string' && query.search.trim().length > 0
    ? query.search.trim()
    : undefined
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'playtime'
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
  const limit = Math.min(parseInt(String(query.limit ?? '100'), 10) || 100, 500)
  const offset = Math.max(parseInt(String(query.offset ?? '0'), 10) || 0, 0)

  // Friend's connected platforms (sanitized — no tokens / metadata leaks).
  const accounts = await db
    .select({
      id: userPlatformAccounts.id,
      platform: userPlatformAccounts.platform,
      username: userPlatformAccounts.username,
      displayName: userPlatformAccounts.displayName,
      avatarUrl: userPlatformAccounts.avatarUrl,
      profileUrl: userPlatformAccounts.profileUrl,
      lastSync: userPlatformAccounts.lastSync,
      gamesCount: count(userPlatformGames.id)
    })
    .from(userPlatformAccounts)
    .leftJoin(userPlatformGames, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
    .where(and(eq(userPlatformAccounts.userId, friendId), eq(userPlatformAccounts.isActive, true)))
    .groupBy(userPlatformAccounts.id)
    .orderBy(desc(userPlatformAccounts.createdAt))

  const filters = [eq(userPlatformAccounts.userId, friendId)]
  if (platform) filters.push(eq(userPlatformAccounts.platform, platform))
  if (search) filters.push(ilike(userPlatformGames.name, `%${search}%`))

  const orderColumn = sortBy === 'lastPlayed'
    ? userPlatformGames.lastPlayed
    : sortBy === 'name'
      ? userPlatformGames.name
      : userPlatformGames.playtimeTotal
  const orderFn = sortOrder === 'asc' ? asc : desc

  const achievementCounts = db
    .select({
      gameId: userPlatformAchievements.platformGameId,
      total: sql<number>`count(*)`.mapWith(Number).as('total'),
      unlocked: sql<number>`count(*) filter (where ${userPlatformAchievements.isUnlocked})`.mapWith(Number).as('unlocked')
    })
    .from(userPlatformAchievements)
    .groupBy(userPlatformAchievements.platformGameId)
    .as('ach_counts')

  const games = await db
    .select({
      id: userPlatformGames.id,
      platformGameId: userPlatformGames.platformGameId,
      name: userPlatformGames.name,
      playtimeTotal: userPlatformGames.playtimeTotal,
      lastPlayed: userPlatformGames.lastPlayed,
      iconUrl: userPlatformGames.iconUrl,
      coverUrl: userPlatformGames.coverUrl,
      isCompleted: userPlatformGames.isCompleted,
      completedAt: userPlatformGames.completedAt,
      platform: userPlatformAccounts.platform,
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

  return {
    success: true,
    accounts,
    games: games.map(g => ({
      ...g,
      achievementPercentage: g.totalAchievements > 0
        ? Math.round((g.unlockedAchievements / g.totalAchievements) * 100)
        : 0
    })),
    pagination: { limit, offset, hasMore: games.length === limit }
  }
})
