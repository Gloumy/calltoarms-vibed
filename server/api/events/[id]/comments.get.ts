import { eq } from 'drizzle-orm'
import { eventComments, user } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!

  const comments = await db
    .select({
      id: eventComments.id,
      userId: eventComments.userId,
      content: eventComments.content,
      createdAt: eventComments.createdAt,
      username: user.username,
      userImage: user.image
    })
    .from(eventComments)
    .innerJoin(user, eq(user.id, eventComments.userId))
    .where(eq(eventComments.eventId, id))
    .orderBy(eventComments.createdAt)

  return comments
})
