import { eq, and, or } from 'drizzle-orm'
import { friendships } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const friendId = getRouterParam(event, 'id')
  const { disabled } = await readBody(event)

  if (!friendId) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  await db
    .update(friendships)
    .set({ notifDisabled: !!disabled })
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(eq(friendships.senderId, me), eq(friendships.receiverId, friendId)),
          and(eq(friendships.senderId, friendId), eq(friendships.receiverId, me))
        )
      )
    )

  return { success: true }
})
