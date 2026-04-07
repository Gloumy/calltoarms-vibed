import { eq, or, and } from 'drizzle-orm'
import { friendships } from '../db/schema'
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

export async function broadcastToFriends(userId: string, data: object) {
  const friendIds = await getFriendIds(userId)
  const message = JSON.stringify(data)

  for (const [, { peer, userId: peerId }] of peers) {
    if (friendIds.includes(peerId)) {
      peer.send(message)
    }
  }
}
