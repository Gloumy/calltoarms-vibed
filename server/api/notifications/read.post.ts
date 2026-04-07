import { eq, and } from 'drizzle-orm'
import { notifications } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const { id } = await readBody(event)

  if (id) {
    // Mark single notification as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))
  } else {
    // Mark all as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, session.user.id))
  }

  return { success: true }
})
