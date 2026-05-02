import { and, asc, desc, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../db/schema'
import { requireFriendship } from '../../../utils/library'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const gameId = getRouterParam(event, 'id')
  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'ID du jeu manquant' })
  }

  // ?userId=... opens up read-only access to a friend's game (with friendship check).
  const query = getQuery(event)
  const targetUserId = typeof query.userId === 'string' && query.userId ? query.userId : userId
  if (targetUserId !== userId) {
    await requireFriendship(userId, targetUserId)
  }

  const [game] = await db
    .select({
      id: userPlatformGames.id,
      platformGameId: userPlatformGames.platformGameId,
      name: userPlatformGames.name,
      playtimeTotal: userPlatformGames.playtimeTotal,
      playtimeRecent: userPlatformGames.playtimeRecent,
      lastPlayed: userPlatformGames.lastPlayed,
      iconUrl: userPlatformGames.iconUrl,
      coverUrl: userPlatformGames.coverUrl,
      isInstalled: userPlatformGames.isInstalled,
      isCompleted: userPlatformGames.isCompleted,
      completedAt: userPlatformGames.completedAt,
      createdAt: userPlatformGames.createdAt,
      updatedAt: userPlatformGames.updatedAt,
      account: {
        id: userPlatformAccounts.id,
        platform: userPlatformAccounts.platform,
        platformId: userPlatformAccounts.platformId,
        username: userPlatformAccounts.username,
        displayName: userPlatformAccounts.displayName,
        avatarUrl: userPlatformAccounts.avatarUrl,
        profileUrl: userPlatformAccounts.profileUrl
      }
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(eq(userPlatformGames.id, gameId), eq(userPlatformAccounts.userId, targetUserId)))
    .limit(1)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Jeu non trouvé' })
  }

  const achievements = await db
    .select()
    .from(userPlatformAchievements)
    .where(eq(userPlatformAchievements.platformGameId, gameId))
    .orderBy(desc(userPlatformAchievements.isUnlocked), desc(userPlatformAchievements.unlockedAt), asc(userPlatformAchievements.name))

  const total = achievements.length
  const unlocked = achievements.filter(a => a.isUnlocked).length
  const totalPoints = achievements.reduce((sum, a) => sum + (a.points ?? 0), 0)
  const unlockedPoints = achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + (a.points ?? 0), 0)
  const rarityStats = {
    common: achievements.filter(a => a.rarity != null && a.rarity > 50).length,
    uncommon: achievements.filter(a => a.rarity != null && a.rarity > 20 && a.rarity <= 50).length,
    rare: achievements.filter(a => a.rarity != null && a.rarity > 5 && a.rarity <= 20).length,
    ultraRare: achievements.filter(a => a.rarity != null && a.rarity <= 5).length
  }

  return {
    success: true,
    isOwnGame: targetUserId === userId,
    game,
    achievements,
    stats: {
      totalAchievements: total,
      unlockedAchievements: unlocked,
      completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      totalPoints,
      unlockedPoints,
      rarityStats
    }
  }
})
