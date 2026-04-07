import { eq, and } from 'drizzle-orm'
import { friendships, user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  // Get pending requests where I'm the receiver
  const rows = await db
    .select({
      senderId: friendships.senderId,
      createdAt: friendships.createdAt,
      senderUsername: user.username,
      senderName: user.name,
      senderImage: user.image
    })
    .from(friendships)
    .innerJoin(user, eq(user.id, friendships.senderId))
    .where(
      and(
        eq(friendships.receiverId, me),
        eq(friendships.status, 'pending')
      )
    )

  return rows
})
