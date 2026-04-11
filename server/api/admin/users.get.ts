import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDB()

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.username,
      u.email,
      u.image,
      u.is_admin,
      u.created_at,
      (SELECT COUNT(*)::int FROM friendships f WHERE f.status = 'accepted'
        AND (f.sender_id = u.id OR f.receiver_id = u.id)) AS friend_count,
      (SELECT COUNT(*)::int FROM community_members cm WHERE cm.user_id = u.id AND cm.status = 'active') AS community_count,
      (SELECT COUNT(*)::int FROM game_session_participations gsp WHERE gsp.user_id = u.id) AS session_count
    FROM "user" u
    ORDER BY u.created_at DESC
  `)

  return rows.rows ?? rows
})
