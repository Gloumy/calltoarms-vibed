import { eq, sql } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

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

  // Check if already joined
  const [existing] = await db
    .select()
    .from(gameSessionParticipations)
    .where(
      sql`${gameSessionParticipations.sessionId} = ${id} AND ${gameSessionParticipations.userId} = ${me}`
    )
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Deja dans la session' })
  }

  await db.insert(gameSessionParticipations).values({
    sessionId: id,
    userId: me
  })

  // Broadcast update
  await broadcastToFriends(me, {
    type: 'session:update',
    payload: { id, createdBy: gameSession.created_by }
  })

  return { success: true }
})
