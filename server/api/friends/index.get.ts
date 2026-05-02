import { eq, or, and, gt, inArray } from 'drizzle-orm'
import { friendships, user, gameSessions, gameSessionParticipations, games } from '../../db/schema'
import { getOnlineUserIds } from '../../routes/_ws'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  // Get all accepted friendships
  const rows = await db
    .select({
      senderId: friendships.senderId,
      receiverId: friendships.receiverId,
      notifDisabled: friendships.notifDisabled,
      createdAt: friendships.createdAt
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.senderId, me),
          eq(friendships.receiverId, me)
        )
      )
    )

  // Get friend user details
  const friendIds = rows.map(r => r.senderId === me ? r.receiverId : r.senderId)

  // Get current user's active session
  const [mySession] = await db
    .select({ sessionId: gameSessionParticipations.sessionId })
    .from(gameSessionParticipations)
    .innerJoin(gameSessions, eq(gameSessions.id, gameSessionParticipations.sessionId))
    .where(
      and(
        eq(gameSessionParticipations.userId, me),
        eq(gameSessions.status, 'active'),
        gt(gameSessions.expiresAt, new Date())
      )
    )
    .limit(1)

  const mySessionId = mySession?.sessionId ?? null

  if (friendIds.length === 0) return { friends: [], mySessionId }

  const friends = await db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      availableUntil: user.availableUntil,
      availableGameId: user.availableGameId
    })
    .from(user)
    .where(or(...friendIds.map(id => eq(user.id, id))))

  // Get active session participation for each friend
  const activeSessions = await db
    .select({
      userId: gameSessionParticipations.userId,
      sessionId: gameSessionParticipations.sessionId,
      gameName: games.name
    })
    .from(gameSessionParticipations)
    .innerJoin(gameSessions, eq(gameSessions.id, gameSessionParticipations.sessionId))
    .leftJoin(games, eq(games.id, gameSessions.gameId))
    .where(
      and(
        eq(gameSessions.status, 'active'),
        gt(gameSessions.expiresAt, new Date()),
        inArray(gameSessionParticipations.userId, friendIds)
      )
    )

  const inSessionMap = new Map<string, { sessionId: string, gameName: string | null }>()
  for (const row of activeSessions) {
    inSessionMap.set(row.userId, { sessionId: row.sessionId, gameName: row.gameName ?? null })
  }

  // Merge online + availability + session info
  const onlineIds = getOnlineUserIds()

  return {
    mySessionId,
    friends: friends.map((f) => {
      const friendship = rows.find(r =>
        (r.senderId === me && r.receiverId === f.id)
        || (r.receiverId === me && r.senderId === f.id)
      )
      return {
        ...f,
        isOnline: onlineIds.has(f.id),
        isAvailable: f.availableUntil !== null && new Date(f.availableUntil) > new Date(),
        inSession: inSessionMap.has(f.id),
        sessionId: inSessionMap.get(f.id)?.sessionId ?? null,
        sessionGameName: inSessionMap.get(f.id)?.gameName ?? null,
        notifDisabled: friendship?.notifDisabled ?? false
      }
    })
  }
})
