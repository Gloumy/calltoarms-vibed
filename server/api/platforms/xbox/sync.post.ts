import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../db/schema'
import { XboxService } from '../../../services/platforms/xbox/XboxService'
import type { XboxAccountMetadata } from '../../../services/platforms/xbox/types'

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
    throw createError({
      statusCode: 404,
      statusMessage: 'Compte Xbox non trouvé. Veuillez d\'abord connecter votre compte Xbox.'
    })
  }

  const service = new XboxService()
  const hydrate = await service.hydrate(account)
  if (!hydrate.success) {
    throw createError({
      statusCode: 401,
      statusMessage: hydrate.error,
      data: { platform: 'xbox', canRetry: false }
    })
  }

  // Persist refreshed tokens immediately so a later failure doesn't lose them.
  const tokens = service.getTokens()
  if (tokens) {
    const metadata: XboxAccountMetadata = {
      userHash: tokens.userHash,
      xuid: tokens.xuid,
      xblUserToken: tokens.xblUserToken,
      msAccessToken: tokens.msAccessToken,
      msTokenExpiresAt: tokens.msTokenExpiresAt,
      xstsTokenExpiresAt: tokens.xstsTokenExpiresAt
    }
    await db
      .update(userPlatformAccounts)
      .set({
        accessToken: tokens.xstsToken,
        refreshToken: tokens.msRefreshToken,
        metadata,
        updatedAt: new Date()
      })
      .where(eq(userPlatformAccounts.id, account.id))
  }

  const syncResult = await service.syncGames(account)
  if (!syncResult.success) {
    throw createError({
      statusCode: 500,
      statusMessage: syncResult.error,
      data: { platform: 'xbox', canRetry: true }
    })
  }

  const syncedGames: { id: string, platformGameId: string, name: string }[] = []

  for (const gameData of syncResult.data) {
    try {
      const [existing] = await db
        .select()
        .from(userPlatformGames)
        .where(and(
          eq(userPlatformGames.platformAccountId, account.id),
          eq(userPlatformGames.platformGameId, gameData.platformGameId)
        ))
        .limit(1)

      if (existing) {
        await db
          .update(userPlatformGames)
          .set({
            name: gameData.name,
            playtimeTotal: gameData.playtimeTotal,
            playtimeRecent: gameData.playtimeRecent,
            lastPlayed: gameData.lastPlayed,
            iconUrl: gameData.iconUrl,
            coverUrl: gameData.coverUrl,
            isInstalled: gameData.isInstalled ?? false,
            updatedAt: new Date()
          })
          .where(eq(userPlatformGames.id, existing.id))
        syncedGames.push({ id: existing.id, platformGameId: gameData.platformGameId, name: gameData.name })
      } else {
        const id = crypto.randomUUID()
        await db.insert(userPlatformGames).values({
          id,
          platformAccountId: account.id,
          platformGameId: gameData.platformGameId,
          name: gameData.name,
          playtimeTotal: gameData.playtimeTotal,
          playtimeRecent: gameData.playtimeRecent,
          lastPlayed: gameData.lastPlayed,
          iconUrl: gameData.iconUrl,
          coverUrl: gameData.coverUrl,
          isInstalled: gameData.isInstalled ?? false
        })
        syncedGames.push({ id, platformGameId: gameData.platformGameId, name: gameData.name })
      }
    } catch (error) {
      console.error(`Sync failure on game ${gameData.name}:`, error)
    }
  }

  let totalAchievements = 0

  for (const game of syncedGames) {
    try {
      const achievementsResult = await service.syncAchievements(account, game.platformGameId)
      if (!achievementsResult.success) continue

      const achievements = achievementsResult.data
      await db.delete(userPlatformAchievements).where(eq(userPlatformAchievements.platformGameId, game.id))

      if (achievements.length > 0) {
        await db.insert(userPlatformAchievements).values(
          achievements.map(a => ({
            id: crypto.randomUUID(),
            platformGameId: game.id,
            achievementId: a.achievementId,
            name: a.name,
            description: a.description,
            iconUrl: a.iconUrl,
            isUnlocked: a.isUnlocked,
            unlockedAt: a.unlockedAt,
            earnedRate: a.earnedRate,
            rarity: a.rarity,
            points: a.points
          }))
        )
        totalAchievements += achievements.length
      }
    } catch (error) {
      console.error(`Achievement sync failure on ${game.name}:`, error)
    }
  }

  await db
    .update(userPlatformAccounts)
    .set({ lastSync: new Date(), updatedAt: new Date() })
    .where(eq(userPlatformAccounts.id, account.id))

  return {
    success: true,
    syncedGames: syncedGames.length,
    syncedAchievements: totalAchievements
  }
})
