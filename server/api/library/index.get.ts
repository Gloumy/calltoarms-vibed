import { and, count, desc, eq, sql, sum } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  // Per-platform account rows + game count.
  const accounts = await db
    .select({
      id: userPlatformAccounts.id,
      platform: userPlatformAccounts.platform,
      platformId: userPlatformAccounts.platformId,
      username: userPlatformAccounts.username,
      displayName: userPlatformAccounts.displayName,
      avatarUrl: userPlatformAccounts.avatarUrl,
      profileUrl: userPlatformAccounts.profileUrl,
      isActive: userPlatformAccounts.isActive,
      lastSync: userPlatformAccounts.lastSync,
      createdAt: userPlatformAccounts.createdAt,
      gamesCount: count(userPlatformGames.id)
    })
    .from(userPlatformAccounts)
    .leftJoin(userPlatformGames, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
    .where(eq(userPlatformAccounts.userId, userId))
    .groupBy(userPlatformAccounts.id)
    .orderBy(desc(userPlatformAccounts.createdAt))

  // Aggregated stats — one round-trip per metric, all gated on the same userId.
  const [totals] = await db
    .select({
      totalGames: count(userPlatformGames.id),
      totalPlaytime: sum(userPlatformGames.playtimeTotal).mapWith(Number)
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(eq(userPlatformAccounts.userId, userId))

  const [achievementTotals] = await db
    .select({
      totalAchievements: count(userPlatformAchievements.id),
      unlockedAchievements: sql<number>`count(*) filter (where ${userPlatformAchievements.isUnlocked})`.mapWith(Number)
    })
    .from(userPlatformAchievements)
    .innerJoin(userPlatformGames, eq(userPlatformGames.id, userPlatformAchievements.platformGameId))
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(eq(userPlatformAccounts.userId, userId)))

  return {
    success: true,
    accounts,
    supportedPlatforms: ['steam', 'playstation', 'xbox'] as const,
    stats: {
      totalConnectedPlatforms: accounts.length,
      totalGames: totals?.totalGames ?? 0,
      totalPlaytime: totals?.totalPlaytime ?? 0,
      totalAchievements: achievementTotals?.totalAchievements ?? 0,
      unlockedAchievements: achievementTotals?.unlockedAchievements ?? 0
    }
  }
})
