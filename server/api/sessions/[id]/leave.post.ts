import { eq, and, ne, asc } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations, sessionMessages, user } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event).catch(() => ({}))
  const confirm = body?.confirm === true

  // Verify session exists
  const [gameSession] = await db
    .select({ createdBy: gameSessions.createdBy, status: gameSessions.status })
    .from(gameSessions)
    .where(eq(gameSessions.id, id))
    .limit(1)

  if (!gameSession) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }

  const isCreator = gameSession.createdBy === me
  const sessionUpdate = { type: 'session:update', payload: { id } }

  // Get leaver info for system message
  const [leaver] = await db
    .select({ username: user.username, image: user.image })
    .from(user)
    .where(eq(user.id, me))
    .limit(1)

  if (isCreator) {
    // Get other participants
    const others = await db
      .select({
        userId: gameSessionParticipations.userId,
        username: user.username,
        joinedAt: gameSessionParticipations.joinedAt
      })
      .from(gameSessionParticipations)
      .innerJoin(user, eq(user.id, gameSessionParticipations.userId))
      .where(
        and(
          eq(gameSessionParticipations.sessionId, id),
          ne(gameSessionParticipations.userId, me)
        )
      )
      .orderBy(asc(gameSessionParticipations.joinedAt))

    // Need confirmation first
    if (!confirm) {
      return {
        needsConfirm: true,
        hasOthers: others.length > 0,
        nextLeader: others[0] ? { id: others[0].userId, username: others[0].username } : null
      }
    }

    const newLeader = others[0]
    if (newLeader) {
      // Transfer ownership to the earliest joiner
      const leaverName = leaver?.username ?? 'Le createur'

      // Insert system message before leaving
      const msgId = crypto.randomUUID()
      await db.insert(sessionMessages).values({
        id: msgId,
        sessionId: id,
        userId: me,
        content: `${leaverName} a quitte la session. ${newLeader.username} est le nouveau leader.`,
        type: 'system'
      })
      await broadcastToSessionParticipants(id, {
        type: 'session:message',
        payload: {
          id: msgId, sessionId: id, userId: me,
          username: leaver?.username ?? '', userImage: leaver?.image ?? null,
          content: `${leaverName} a quitte la session. ${newLeader.username} est le nouveau leader.`,
          type: 'system', createdAt: new Date().toISOString()
        }
      })

      // Broadcast BEFORE removing creator, so participants list is still complete
      await broadcastToSessionParticipants(id, sessionUpdate, me)

      await db.update(gameSessions)
        .set({ createdBy: newLeader.userId })
        .where(eq(gameSessions.id, id))

      await db.delete(gameSessionParticipations)
        .where(
          and(
            eq(gameSessionParticipations.sessionId, id),
            eq(gameSessionParticipations.userId, me)
          )
        )

      // Also broadcast to creator's friends (they see the feed)
      await broadcastToFriends(me, sessionUpdate)

      return { success: true, transferred: true, newLeaderId: newLeader.userId }
    } else {
      // No other participants — close the session
      // Broadcast to friends BEFORE closing (so they refetch and see it gone)
      await broadcastToFriends(me, sessionUpdate)

      await db.update(gameSessions)
        .set({ status: 'closed' })
        .where(eq(gameSessions.id, id))

      await db.delete(gameSessionParticipations)
        .where(eq(gameSessionParticipations.sessionId, id))

      return { success: true, closed: true }
    }
  }

  // Non-creator: insert system message before leaving
  const leaveMsgId = crypto.randomUUID()
  await db.insert(sessionMessages).values({
    id: leaveMsgId,
    sessionId: id,
    userId: me,
    content: `${leaver?.username ?? 'Quelqu\'un'} a quitte la session`,
    type: 'system'
  })
  await broadcastToSessionParticipants(id, {
    type: 'session:message',
    payload: {
      id: leaveMsgId, sessionId: id, userId: me,
      username: leaver?.username ?? '', userImage: leaver?.image ?? null,
      content: `${leaver?.username ?? 'Quelqu\'un'} a quitte la session`,
      type: 'system', createdAt: new Date().toISOString()
    }
  })

  // Broadcast BEFORE removing, so participants list is still complete
  await broadcastToSessionParticipants(id, sessionUpdate, me)

  const deleted = await db
    .delete(gameSessionParticipations)
    .where(
      and(
        eq(gameSessionParticipations.sessionId, id),
        eq(gameSessionParticipations.userId, me)
      )
    )
    .returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tu n\'es pas dans cette session' })
  }

  // Also broadcast to leaver's friends (they see the session in their feed too)
  await broadcastToFriends(me, sessionUpdate)

  return { success: true }
})
