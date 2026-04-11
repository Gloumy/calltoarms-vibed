import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Get community details
  const rows = await db.execute(sql`
    SELECT
      c.*,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      u.username AS creator_name,
      u.image AS creator_avatar,
      (SELECT COUNT(*)::int FROM community_members cm WHERE cm.community_id = c.id AND cm.status = 'active') AS member_count,
      EXISTS(SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me} AND cm.status = 'active') AS is_member,
      (SELECT role FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me} AND cm.status = 'active') AS my_role,
      (SELECT notif_preference FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me} AND cm.status = 'active') AS my_notif_preference,
      (SELECT cm.status FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ${me}) AS my_membership_status
    FROM communities c
    JOIN "user" u ON u.id = c.created_by
    LEFT JOIN games g ON g.id = c.game_id
    WHERE c.id = ${id}
  `)

  const community = (rows.rows ?? rows)[0] as any
  if (!community) {
    throw createError({ statusCode: 404, statusMessage: 'Communaute introuvable' })
  }

  // Check access — active members, invited users, and public communities
  if (!community.is_public && !community.is_member && !community.my_membership_status) {
    throw createError({ statusCode: 403, statusMessage: 'Communaute privee' })
  }

  // Get active members
  const members = await db.execute(sql`
    SELECT
      cm.user_id,
      cm.role,
      cm.joined_at,
      u.username,
      u.image
    FROM community_members cm
    JOIN "user" u ON u.id = cm.user_id
    WHERE cm.community_id = ${id} AND cm.status = 'active'
    ORDER BY
      CASE cm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
      cm.joined_at ASC
  `)

  // Get pending invites (for admins/moderators)
  const pendingInvites = await db.execute(sql`
    SELECT
      cm.user_id,
      u.username,
      u.image
    FROM community_members cm
    JOIN "user" u ON u.id = cm.user_id
    WHERE cm.community_id = ${id} AND cm.status = 'invited'
    ORDER BY cm.joined_at DESC
  `)

  // Get recent activity (sessions + events in this community)
  const activity = await db.execute(sql`
    (
      SELECT 'session' AS type, gs.id, gs.created_at, gs.created_by, u.username AS creator_name,
        g.name AS game_name, NULL AS title,
        gs.status, gs.expires_at,
        (SELECT COUNT(*)::int FROM game_session_participations gsp WHERE gsp.session_id = gs.id) AS participant_count
      FROM game_sessions gs
      JOIN "user" u ON u.id = gs.created_by
      LEFT JOIN games g ON g.id = gs.game_id
      WHERE gs.community_id = ${id}
      ORDER BY gs.created_at DESC
      LIMIT 10
    )
    UNION ALL
    (
      SELECT 'event' AS type, e.id, e.created_at, e.created_by, u.username AS creator_name,
        g.name AS game_name, e.title,
        NULL AS status, e.scheduled_at AS expires_at,
        (SELECT COUNT(*)::int FROM event_participations ep WHERE ep.event_id = e.id AND ep.status = 'accepted') AS participant_count
      FROM events e
      JOIN "user" u ON u.id = e.created_by
      LEFT JOIN games g ON g.id = e.game_id
      WHERE e.community_id = ${id}
      ORDER BY e.created_at DESC
      LIMIT 10
    )
    ORDER BY created_at DESC
    LIMIT 15
  `)

  return {
    ...community,
    members: members.rows ?? members,
    pendingInvites: pendingInvites.rows ?? pendingInvites,
    activity: activity.rows ?? activity
  }
})
