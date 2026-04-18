import { eq, and } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations, sessionMessages, user } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { content } = await readBody(event)

  if (!content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Contenu requis' })
  }

  // Verify session exists and is active
  const [gameSession] = await db
    .select({ id: gameSessions.id, status: gameSessions.status })
    .from(gameSessions)
    .where(eq(gameSessions.id, id))
    .limit(1)

  if (!gameSession) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }

  // Verify user is a participant
  const [participation] = await db
    .select({ userId: gameSessionParticipations.userId })
    .from(gameSessionParticipations)
    .where(and(
      eq(gameSessionParticipations.sessionId, id),
      eq(gameSessionParticipations.userId, me)
    ))
    .limit(1)

  if (!participation) {
    throw createError({ statusCode: 403, statusMessage: 'Tu ne fais pas partie de cette session' })
  }

  const messageId = crypto.randomUUID()

  await db.insert(sessionMessages).values({
    id: messageId,
    sessionId: id,
    userId: me,
    content: content.trim()
  })

  // Get user info for the broadcast payload
  const [sender] = await db
    .select({ username: user.username, image: user.image })
    .from(user)
    .where(eq(user.id, me))
    .limit(1)

  // Broadcast to all session participants via WebSocket
  await broadcastToSessionParticipants(id, {
    type: 'session:message',
    payload: {
      id: messageId,
      sessionId: id,
      userId: me,
      username: sender?.username ?? '',
      userImage: sender?.image ?? null,
      content: content.trim(),
      createdAt: new Date().toISOString()
    }
  })

  return { id: messageId }
})
