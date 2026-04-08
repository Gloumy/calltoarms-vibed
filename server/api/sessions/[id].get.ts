import { eq, sql } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations, user, games, communities } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const id = getRouterParam(event, 'id')!

  const rows = await db.execute(sql`
    SELECT
      gs.*,
      u.username AS creator_name,
      u.image AS creator_avatar,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      c.name AS community_name,
      COUNT(gsp.user_id)::int AS current_players
    FROM game_sessions gs
    JOIN "user" u ON u.id = gs.created_by
    LEFT JOIN games g ON g.id = gs.game_id
    LEFT JOIN communities c ON c.id = gs.community_id
    LEFT JOIN game_session_participations gsp ON gsp.session_id = gs.id
    WHERE gs.id = ${id}
    GROUP BY gs.id, u.username, u.image, g.name, g.cover_url, c.name
  `)

  const result = (rows.rows ?? rows)[0]
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }

  // Get participants
  const participants = await db
    .select({
      userId: gameSessionParticipations.userId,
      username: user.username,
      image: user.image,
      joinedAt: gameSessionParticipations.joinedAt
    })
    .from(gameSessionParticipations)
    .innerJoin(user, eq(user.id, gameSessionParticipations.userId))
    .where(eq(gameSessionParticipations.sessionId, id))

  return { ...result, participants }
})
