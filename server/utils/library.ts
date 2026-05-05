import { and, asc, desc, eq, or, type SQL } from 'drizzle-orm'
import { friendships, userPlatformAccounts, userPlatformGames } from '../db/schema'

// Returns the user's "manual" platform account row, creating it on first use.
// Manual games live on this synthetic platform so they share all the existing
// per-account queries (sort, search, friend access, etc.) without a parallel table.
export async function ensureManualAccount(userId: string) {
  const db = useDB()
  const [existing] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'manual')))
    .limit(1)
  if (existing) return existing

  const id = crypto.randomUUID()
  const [created] = await db
    .insert(userPlatformAccounts)
    .values({
      id,
      userId,
      platform: 'manual',
      platformId: userId,
      displayName: 'Ajouts manuels',
      isActive: true
    })
    .returning()
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Échec création compte manuel' })
  }
  return created
}

export type GameSortBy = 'playtime' | 'lastPlayed' | 'name'
export type GameSortOrder = 'asc' | 'desc'

// Build a Drizzle orderBy clause for the userPlatformGames table.
// Default = playtime DESC + name ASC (matches the legacy "most played first" behavior).
// `lastPlayed` falls back to playtime when null so freshly synced games don't bubble to the top.
export function gamesOrderBy(sortBy?: string, sortOrder?: string): SQL[] {
  const fn = sortOrder === 'asc' ? asc : desc
  switch (sortBy) {
    case 'name':
      return [(sortOrder === 'desc' ? desc : asc)(userPlatformGames.name)]
    case 'lastPlayed':
      return [fn(userPlatformGames.lastPlayed), desc(userPlatformGames.playtimeTotal)]
    case 'playtime':
    default:
      return [fn(userPlatformGames.playtimeTotal), asc(userPlatformGames.name)]
  }
}

export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours < 24) return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`
}

// Throws 403 unless `userA` and `userB` have an accepted friendship in either direction.
export async function requireFriendship(userA: string, userB: string): Promise<void> {
  if (userA === userB) return
  const db = useDB()
  const [row] = await db
    .select({ status: friendships.status })
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.senderId, userA), eq(friendships.receiverId, userB)),
          and(eq(friendships.senderId, userB), eq(friendships.receiverId, userA))
        ),
        eq(friendships.status, 'accepted')
      )
    )
    .limit(1)

  if (!row) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Vous n\'avez pas accès à la bibliothèque de cet utilisateur'
    })
  }
}
