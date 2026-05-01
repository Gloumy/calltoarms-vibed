import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames, userPlatformAchievements } from '../../../db/schema'
import { SteamService } from '../../../services/platforms/steam/SteamService'
import type { GameData } from '../../../services/platforms/types'

const ONE_HOUR_MS = 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const [account] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'steam')))
    .limit(1)

  if (!account) {
    throw createError({
      statusCode: 404,
      statusMessage: "Compte Steam non trouvé. Veuillez d'abord connecter votre compte Steam."
    })
  }

  const steamService = new SteamService()
  const syncResult = await steamService.syncGames(account)
  if (!syncResult.success) {
    throw createError({
      statusCode: 500,
      statusMessage: syncResult.error,
      data: { platform: 'steam', canRetry: true }
    })
  }

  // Incremental sync: on subsequent runs, only process games that have been played since
  // the last sync (with a 1h margin to cover clock drift) or have recent playtime.
  let gamesToSync: GameData[] = syncResult.data
  if (account.lastSync) {
    const threshold = account.lastSync.getTime() - ONE_HOUR_MS
    gamesToSync = syncResult.data.filter((game) => {
      if (game.lastPlayed && game.lastPlayed.getTime() > threshold) return true
      if (game.playtimeRecent && game.playtimeRecent > 0) return true
      return false
    })
  }

  // Nothing to sync and we've synced before → bump lastSync and exit early.
  if (gamesToSync.length === 0 && account.lastSync) {
    await db
      .update(userPlatformAccounts)
      .set({ lastSync: new Date(), updatedAt: new Date() })
      .where(eq(userPlatformAccounts.id, account.id))
    return {
      success: true,
      syncedGames: 0,
      syncedAchievements: 0,
      message: "Aucun jeu Steam n'a été joué depuis la dernière synchronisation"
    }
  }

  const syncedGames: { id: string; platformGameId: string; name: string; lastPlayed: Date | null }[] = []

  for (const gameData of gamesToSync) {
    // Backfill lastPlayed when Steam reports recent activity but no timestamp.
    if (!gameData.lastPlayed && gameData.playtimeRecent && gameData.playtimeRecent > 0) {
      gameData.lastPlayed = new Date()
    }

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
        syncedGames.push({ id: existing.id, platformGameId: gameData.platformGameId, name: gameData.name, lastPlayed: gameData.lastPlayed ?? null })
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
        syncedGames.push({ id, platformGameId: gameData.platformGameId, name: gameData.name, lastPlayed: gameData.lastPlayed ?? null })
      }
    } catch (error) {
      console.error(`Sync failure on game ${gameData.name}:`, error)
      // Skip and continue — one bad game shouldn't abort the whole sync.
    }
  }

  let totalAchievements = 0

  for (const game of syncedGames) {
    try {
      const existing = await db
        .select({ achievementId: userPlatformAchievements.achievementId, isUnlocked: userPlatformAchievements.isUnlocked })
        .from(userPlatformAchievements)
        .where(eq(userPlatformAchievements.platformGameId, game.id))

      const existingUnlocked = new Set(existing.filter((a) => a.isUnlocked).map((a) => a.achievementId))

      const achievementsResult = await steamService.syncAchievements(account, game.platformGameId, existingUnlocked)
      if (!achievementsResult.success) continue

      const { achievements, mostRecentUnlock } = achievementsResult.data

      // Backfill lastPlayed from achievement unlock if we never saw a playtime timestamp.
      if (mostRecentUnlock && !game.lastPlayed) {
        await db
          .update(userPlatformGames)
          .set({ lastPlayed: mostRecentUnlock, updatedAt: new Date() })
          .where(eq(userPlatformGames.id, game.id))
      }

      // Replace strategy: simpler than diffing, and Steam returns the full set every time.
      await db.delete(userPlatformAchievements).where(eq(userPlatformAchievements.platformGameId, game.id))

      if (achievements.length > 0) {
        await db.insert(userPlatformAchievements).values(
          achievements.map((a) => ({
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
