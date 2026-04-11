import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDB()

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.is_public,
      c.created_at,
      u.username AS creator_name,
      (SELECT COUNT(*)::int FROM community_members cm WHERE cm.community_id = c.id AND cm.status = 'active') AS member_count
    FROM communities c
    JOIN "user" u ON u.id = c.created_by
    ORDER BY c.created_at DESC
  `)

  return rows.rows ?? rows
})
