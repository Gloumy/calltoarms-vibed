import { eq, and } from 'drizzle-orm'
import { friendships, user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  // Pending requests where I'm the sender — counterpart to pending.get.ts which
  // returns those where I'm the receiver.
  const rows = await db
    .select({
      receiverId: friendships.receiverId,
      createdAt: friendships.createdAt,
      receiverUsername: user.username,
      receiverName: user.name,
      receiverImage: user.image
    })
    .from(friendships)
    .innerJoin(user, eq(user.id, friendships.receiverId))
    .where(
      and(
        eq(friendships.senderId, me),
        eq(friendships.status, 'pending')
      )
    )

  return rows
})
