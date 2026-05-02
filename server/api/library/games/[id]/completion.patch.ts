import { and, desc, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const gameId = getRouterParam(event, 'id')
  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'ID du jeu manquant' })
  }

  const body = await readBody<{ isCompleted?: unknown }>(event)
  if (typeof body?.isCompleted !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'isCompleted doit être un booléen' })
  }

  const [game] = await db
    .select({
      id: userPlatformGames.id,
      lastPlayed: userPlatformGames.lastPlayed
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(eq(userPlatformGames.id, gameId), eq(userPlatformAccounts.userId, userId)))
    .limit(1)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Jeu non trouvé' })
  }

  // Pin the completion timestamp to the most recent achievement unlock when possible —
  // it's a better proxy for "when the player actually finished" than the last-played time.
  let completedAt: Date | null = null
  if (body.isCompleted) {
    const [latestUnlock] = await db
      .select({ unlockedAt: userPlatformAchievements.unlockedAt })
      .from(userPlatformAchievements)
      .where(and(eq(userPlatformAchievements.platformGameId, gameId), eq(userPlatformAchievements.isUnlocked, true)))
      .orderBy(desc(userPlatformAchievements.unlockedAt))
      .limit(1)
    completedAt = latestUnlock?.unlockedAt ?? game.lastPlayed ?? new Date()
  }

  await db
    .update(userPlatformGames)
    .set({ isCompleted: body.isCompleted, completedAt, updatedAt: new Date() })
    .where(eq(userPlatformGames.id, gameId))

  return {
    success: true,
    isCompleted: body.isCompleted,
    completedAt
  }
})
