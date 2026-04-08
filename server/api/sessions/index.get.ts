import { eq, and, or, gt, ne, sql, desc, isNotNull } from 'drizzle-orm'
import { gameSessions, gameSessionParticipations, user, friendships, communities, communityMembers, games } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const rows = await db.execute(sql`
    SELECT
      gs.id,
      gs.created_by,
      gs.game_id,
      gs.community_id,
      gs.visibility,
      gs.status,
      gs.max_players,
      gs.expires_at,
      gs.discussion,
      gs.created_at,
      u.username AS creator_name,
      u.image AS creator_avatar,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      c.name AS community_name,
      COUNT(gsp.user_id)::int AS current_players,
      EXISTS(
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND ((f.sender_id = ${me} AND f.receiver_id = gs.created_by)
          OR (f.receiver_id = ${me} AND f.sender_id = gs.created_by))
      ) AS is_friend,
      EXISTS(
        SELECT 1 FROM game_session_participations p
        WHERE p.session_id = gs.id AND p.user_id = ${me}
      ) AS has_joined
    FROM game_sessions gs
    JOIN "user" u ON u.id = gs.created_by
    LEFT JOIN games g ON g.id = gs.game_id
    LEFT JOIN communities c ON c.id = gs.community_id
    LEFT JOIN game_session_participations gsp ON gsp.session_id = gs.id
    WHERE gs.status = 'active'
      AND gs.expires_at > now()
      AND (
        -- My own sessions
        gs.created_by = ${me}
        -- Friend sessions
        OR EXISTS(SELECT 1 FROM friendships f WHERE f.status = 'accepted'
          AND ((f.sender_id = ${me} AND f.receiver_id = gs.created_by)
            OR (f.receiver_id = ${me} AND f.sender_id = gs.created_by)))
        -- Community sessions
        OR (gs.community_id IS NOT NULL AND EXISTS(
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = gs.community_id AND cm.user_id = ${me}
            AND cm.notif_preference != 'none'
        ))
        -- Public sessions
        OR gs.visibility = 'public'
      )
    GROUP BY gs.id, u.username, u.image, g.name, g.cover_url, c.name
    ORDER BY is_friend DESC, gs.created_at DESC
  `)

  return rows.rows ?? rows
})
