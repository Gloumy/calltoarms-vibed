import { eq, or, and, sql } from 'drizzle-orm'
import { friendships, gameSessionParticipations, gameSessions, communityMembers } from '../db/schema'
import { peers } from '../routes/_ws'

export async function getFriendIds(userId: string): Promise<string[]> {
  const db = useDB()
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.senderId, userId),
          eq(friendships.receiverId, userId)
        )
      )
    )

  return rows.map(r =>
    r.senderId === userId ? r.receiverId : r.senderId
  )
}

export function broadcastToUserIds(userIds: string[], data: object) {
  const message = JSON.stringify(data)
  for (const [, { peer, userId }] of peers) {
    if (userIds.includes(userId)) {
      peer.send(message)
    }
  }
}

export async function broadcastToFriends(userId: string, data: object) {
  const friendIds = await getFriendIds(userId)
  broadcastToUserIds(friendIds, data)
}

export async function broadcastToSessionParticipants(sessionId: string, data: object, excludeUserId?: string) {
  const db = useDB()
  const rows = await db
    .select({ userId: gameSessionParticipations.userId })
    .from(gameSessionParticipations)
    .where(eq(gameSessionParticipations.sessionId, sessionId))

  // Also include the session creator (they may have left participations but still see the feed)
  const [session] = await db
    .select({ createdBy: gameSessions.createdBy })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .limit(1)

  const userIds = new Set(rows.map(r => r.userId))
  if (session) userIds.add(session.createdBy)
  if (excludeUserId) userIds.delete(excludeUserId)

  broadcastToUserIds([...userIds], data)
}

export async function broadcastToCommunityMembers(communityId: string, data: object, excludeUserId?: string) {
  const db = useDB()
  const rows = await db
    .select({ userId: communityMembers.userId })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.status, 'active')
    ))

  const userIds = rows.map(r => r.userId).filter(id => id !== excludeUserId)
  broadcastToUserIds(userIds, data)
}
