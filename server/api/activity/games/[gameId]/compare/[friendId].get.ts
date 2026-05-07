import { and, eq, sql } from 'drizzle-orm'
import { games, user as userTable, userPlatformAccounts, userPlatformAchievements, userPlatformGames } from '../../../../../db/schema'
import { requireFriendship } from '../../../../../utils/library'

interface SideStats {
  playtimeTotal: number
  achievementsUnlocked: number
  achievementsTotal: number
  achievementPercentage: number
  isCompleted: boolean
  lastPlayed: string | null
  platforms: string[]
}

interface ComparisonResponse {
  game: { id: number, name: string, coverUrl: string | null }
  friend: { id: string, username: string, name: string, image: string | null, stats: SideStats }
  me: { hasGame: boolean, stats: SideStats | null }
}

export default defineEventHandler(async (event): Promise<ComparisonResponse> => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const gameIdParam = getRouterParam(event, 'gameId')
  const friendId = getRouterParam(event, 'friendId')
  if (!gameIdParam || !friendId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId ou friendId manquant' })
  }
  const gameId = parseInt(gameIdParam, 10)
  if (Number.isNaN(gameId)) {
    throw createError({ statusCode: 400, statusMessage: 'gameId invalide' })
  }

  await requireFriendship(me, friendId)

  // Game catalog row (for header).
  const [game] = await db
    .select({ id: games.id, name: games.name, coverUrl: games.coverUrl })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)
  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Jeu introuvable' })
  }

  // Friend profile (header).
  const [friend] = await db
    .select({ id: userTable.id, username: userTable.username, name: userTable.name, image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, friendId))
    .limit(1)
  if (!friend) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })
  }

  const friendStats = await aggregateStats(db, friendId, gameId)
  const myStats = await aggregateStats(db, me, gameId)

  if (!friendStats) {
    // Friend doesn't actually have this game on any platform.
    throw createError({ statusCode: 404, statusMessage: 'Cet ami ne possède pas ce jeu' })
  }

  return {
    game,
    friend: { ...friend, stats: friendStats },
    me: { hasGame: myStats !== null, stats: myStats }
  }
})

async function aggregateStats(db: ReturnType<typeof useDB>, userId: string, gameId: number): Promise<SideStats | null> {
  // Pull all per-platform rows for this user's gameId.
  const rows = await db
    .select({
      id: userPlatformGames.id,
      platform: userPlatformAccounts.platform,
      playtimeTotal: userPlatformGames.playtimeTotal,
      lastPlayed: userPlatformGames.lastPlayed,
      isCompleted: userPlatformGames.isCompleted
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
    .where(and(
      eq(userPlatformAccounts.userId, userId),
      eq(userPlatformGames.gameId, gameId)
    ))

  if (rows.length === 0) return null

  const platformGameIds = rows.map(r => r.id)
  // Achievement counts across all platforms for this game-user combo.
  // We pick the best percentage (max unlocked/total) across platforms rather than summing,
  // since achievements are per-platform sets and summing % is meaningless.
  const achRows = await db
    .select({
      gameId: userPlatformAchievements.platformGameId,
      total: sql<number>`count(*)::int`,
      unlocked: sql<number>`count(*) filter (where ${userPlatformAchievements.isUnlocked})::int`
    })
    .from(userPlatformAchievements)
    .where(sql`${userPlatformAchievements.platformGameId} IN ${platformGameIds}`)
    .groupBy(userPlatformAchievements.platformGameId)

  let bestUnlocked = 0
  let bestTotal = 0
  let bestPercent = 0
  for (const a of achRows) {
    if (a.total > 0) {
      const pct = (a.unlocked / a.total) * 100
      if (pct > bestPercent) {
        bestPercent = pct
        bestUnlocked = a.unlocked
        bestTotal = a.total
      }
    }
  }

  let playtimeSum = 0
  let lastPlayed: Date | null = null
  let isCompleted = false
  const platforms = new Set<string>()
  for (const r of rows) {
    playtimeSum += r.playtimeTotal
    if (r.lastPlayed && (!lastPlayed || r.lastPlayed > lastPlayed)) lastPlayed = r.lastPlayed
    if (r.isCompleted) isCompleted = true
    platforms.add(r.platform)
  }

  return {
    playtimeTotal: playtimeSum,
    achievementsUnlocked: bestUnlocked,
    achievementsTotal: bestTotal,
    achievementPercentage: Math.round(bestPercent),
    isCompleted,
    lastPlayed: lastPlayed ? lastPlayed.toISOString() : null,
    platforms: [...platforms]
  }
}
