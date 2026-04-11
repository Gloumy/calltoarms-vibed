import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const rows = await db.execute(sql`
    SELECT
      e.id,
      e.created_by,
      e.community_id,
      e.game_id,
      e.title,
      e.description,
      e.visibility,
      e.scheduled_at,
      e.discussion,
      e.session_id,
      e.created_at,
      u.username AS creator_name,
      u.image AS creator_avatar,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      c.name AS community_name,
      (SELECT COUNT(*) FROM event_participations ep WHERE ep.event_id = e.id AND ep.status = 'accepted')::int AS accepted_count,
      (SELECT COUNT(*) FROM event_participations ep WHERE ep.event_id = e.id AND ep.status = 'maybe')::int AS maybe_count,
      (SELECT status FROM event_participations ep WHERE ep.event_id = e.id AND ep.user_id = ${me}) AS my_status
    FROM events e
    JOIN "user" u ON u.id = e.created_by
    LEFT JOIN games g ON g.id = e.game_id
    LEFT JOIN communities c ON c.id = e.community_id
    WHERE e.scheduled_at > now() - interval '1 day'
      AND (
        e.created_by = ${me}
        OR e.visibility = 'public'
        OR EXISTS(SELECT 1 FROM event_participations ep WHERE ep.event_id = e.id AND ep.user_id = ${me})
        OR (e.visibility = 'friends' AND EXISTS(
          SELECT 1 FROM friendships f WHERE f.status = 'accepted'
          AND ((f.sender_id = ${me} AND f.receiver_id = e.created_by)
            OR (f.receiver_id = ${me} AND f.sender_id = e.created_by))
        ))
        OR (e.community_id IS NOT NULL AND EXISTS(
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = e.community_id AND cm.user_id = ${me}
        ))
      )
    ORDER BY e.scheduled_at ASC
  `)

  return rows.rows ?? rows
})
