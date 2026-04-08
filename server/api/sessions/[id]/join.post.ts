import { eq, and, sql } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event).catch(() => ({}))
  const force = body?.force === true

  // Get session with player count
  const rows = await db.execute(sql`
    SELECT gs.*, COUNT(gsp.user_id)::int AS current_players
    FROM game_sessions gs
    LEFT JOIN game_session_participations gsp ON gsp.session_id = gs.id
    WHERE gs.id = ${id}
    GROUP BY gs.id
  `)

  const gameSession = (rows.rows ?? rows)[0] as any
  if (!gameSession) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }

  if (gameSession.status !== 'active') {
    throw createError({ statusCode: 400, statusMessage: 'Session terminee' })
  }

  if (new Date(gameSession.expires_at) <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Session expiree' })
  }

  if (gameSession.max_players && gameSession.current_players >= gameSession.max_players) {
    throw createError({ statusCode: 400, statusMessage: 'Session complete' })
  }

  // Check if already in THIS session
  const [alreadyHere] = await db
    .select()
    .from(gameSessionParticipations)
    .where(
      and(
        eq(gameSessionParticipations.sessionId, id),
        eq(gameSessionParticipations.userId, me)
      )
    )
    .limit(1)

  if (alreadyHere) {
    throw createError({ statusCode: 409, statusMessage: 'Deja dans la session' })
  }

  // Check if already in ANOTHER active session
  const currentSessionRows = await db.execute(sql`
    SELECT gs.id, g.name AS game_name
    FROM game_session_participations gsp
    JOIN game_sessions gs ON gs.id = gsp.session_id
    LEFT JOIN games g ON g.id = gs.game_id
    WHERE gsp.user_id = ${me}
      AND gs.status = 'active'
      AND gs.expires_at > now()
      AND gs.created_by != ${me}
    LIMIT 1
  `)
  const currentSession = ((currentSessionRows.rows ?? currentSessionRows) as any[])[0]

  if (currentSession && !force) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Deja dans une autre session',
      data: {
        code: 'ALREADY_IN_SESSION',
        currentSessionId: currentSession.id,
        currentSessionGameName: currentSession.game_name
      }
    })
  }

  // If force, leave current session first
  if (currentSession && force) {
    // Notify old session participants before leaving
    await broadcastToSessionParticipants(currentSession.id, {
      type: 'session:update',
      payload: { id: currentSession.id }
    }, me)

    await db
      .delete(gameSessionParticipations)
      .where(
        and(
          eq(gameSessionParticipations.sessionId, currentSession.id),
          eq(gameSessionParticipations.userId, me)
        )
      )

    await broadcastToFriends(me, {
      type: 'session:update',
      payload: { id: currentSession.id }
    })
  }

  await db.insert(gameSessionParticipations).values({
    sessionId: id,
    userId: me
  })

  // Notify all participants of the joined session + friends
  await broadcastToSessionParticipants(id, {
    type: 'session:update',
    payload: { id }
  }, me)
  await broadcastToFriends(me, {
    type: 'session:update',
    payload: { id }
  })

  return { success: true }
})
