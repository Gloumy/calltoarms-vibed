import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.description,
      c.game_id,
      c.is_public,
      c.created_by,
      c.created_at,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      u.username AS creator_name,
      (SELECT COUNT(*)::int FROM community_members cm WHERE cm.community_id = c.id AND cm.status = 'active') AS member_count,
      EXISTS(SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me} AND cm.status = 'active') AS is_member,
      (SELECT cm.status FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me}) AS my_membership_status,
      (SELECT role FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me} AND cm.status = 'active') AS my_role
    FROM communities c
    JOIN "user" u ON u.id = c.created_by
    LEFT JOIN games g ON g.id = c.game_id
    WHERE c.is_public = true
      OR EXISTS(SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me})
    ORDER BY is_member DESC, member_count DESC, c.created_at DESC
  `)

  return rows.rows ?? rows
})
