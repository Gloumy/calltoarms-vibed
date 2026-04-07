import { eq, or, and } from 'drizzle-orm'
import { friendships, user } from '../../db/schema'
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

  if (friendIds.length === 0) return []

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

  // Merge online + availability info
  const onlineIds = getOnlineUserIds()

  return friends.map(f => {
    const friendship = rows.find(r =>
      (r.senderId === me && r.receiverId === f.id) ||
      (r.receiverId === me && r.senderId === f.id)
    )
    return {
      ...f,
      isOnline: onlineIds.has(f.id),
      isAvailable: f.availableUntil !== null && new Date(f.availableUntil) > new Date(),
      notifDisabled: friendship?.notifDisabled ?? false
    }
  })
})
