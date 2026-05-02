import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../db/schema'
import { PlayStationService } from '../../../services/platforms/playstation/PlayStationService'
import type { GameData } from '../../../services/platforms/types'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const [account] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'playstation')))
    .limit(1)

  if (!account) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Compte PlayStation non trouvé. Veuillez d\'abord connecter votre compte PlayStation.'
    })
  }

  const service = new PlayStationService()
  const hydrate = await service.hydrate(account)
  if (!hydrate.success) {
    throw createError({
      statusCode: 401,
      statusMessage: hydrate.error,
      data: { platform: 'playstation', canRetry: false }
    })
  }

  // Persist any refreshed tokens so the next sync can skip the NPSSO exchange.
  const tokens = service.getTokens()
  if (tokens && tokens.refreshToken !== account.refreshToken) {
    await db
      .update(userPlatformAccounts)
      .set({ refreshToken: tokens.refreshToken, updatedAt: new Date() })
      .where(eq(userPlatformAccounts.id, account.id))
  }

  const syncResult = await service.syncGames(account)
  if (!syncResult.success) {
    throw createError({
      statusCode: 500,
      statusMessage: syncResult.error,
      data: { platform: 'playstation', canRetry: true }
    })
  }

  // Incremental: skip games not played since lastSync (24h margin for tz drift).
  // PSN doesn't expose `playtimeRecent`, so the only signal we have is `lastPlayed`.
  let gamesToSync: GameData[] = syncResult.data
  if (account.lastSync) {
    const threshold = account.lastSync.getTime() - ONE_DAY_MS
    gamesToSync = syncResult.data.filter(game => game.lastPlayed && game.lastPlayed.getTime() > threshold)
  }

  if (gamesToSync.length === 0 && account.lastSync) {
    await db
      .update(userPlatformAccounts)
      .set({ lastSync: new Date(), updatedAt: new Date() })
      .where(eq(userPlatformAccounts.id, account.id))
    return {
      success: true,
      syncedGames: 0,
      syncedAchievements: 0,
      message: 'Aucun jeu PlayStation n\'a été joué depuis la dernière synchronisation'
    }
  }

  // PS5/PS4 mapping is held inside the service (populated by syncGames) and consumed
  // by syncAchievements to pick the right npServiceName.
  const syncedGames: { id: string, platformGameId: string, name: string }[] = []

  for (const gameData of gamesToSync) {
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
      console.error(`Trophy sync failure on ${game.name}:`, error)
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
