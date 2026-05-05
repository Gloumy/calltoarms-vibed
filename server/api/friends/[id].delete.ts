import { and, eq, or } from 'drizzle-orm'
import { friendships } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const otherId = getRouterParam(event, 'id')

  if (!otherId) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  // Single endpoint to cancel a sent request, reject one received, or remove an
  // accepted friend — the row is the same shape regardless of status, and the
  // user's intent ("plus rien entre nous") is identical.
  const result = await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.senderId, me), eq(friendships.receiverId, otherId)),
        and(eq(friendships.senderId, otherId), eq(friendships.receiverId, me))
      )
    )
    .returning({ senderId: friendships.senderId })

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Aucune relation à supprimer' })
  }

  return { success: true }
})
