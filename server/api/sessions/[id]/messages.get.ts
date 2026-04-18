import { eq } from 'drizzle-orm'
import { sessionMessages, user } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!

  const messages = await db
    .select({
      id: sessionMessages.id,
      userId: sessionMessages.userId,
      content: sessionMessages.content,
      type: sessionMessages.type,
      createdAt: sessionMessages.createdAt,
      username: user.username,
      userImage: user.image
    })
    .from(sessionMessages)
    .innerJoin(user, eq(user.id, sessionMessages.userId))
    .where(eq(sessionMessages.sessionId, id))
    .orderBy(sessionMessages.createdAt)

  return messages
})
