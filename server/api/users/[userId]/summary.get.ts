import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'ID utilisateur requis' })
  }

  // Fetch user basic info
  const userRows = await db.execute(sql`
    SELECT id, username, image, created_at
    FROM "user"
    WHERE id = ${userId}
    LIMIT 1
  `)
  const target = (userRows.rows ?? userRows)[0]

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })
  }

  // Fetch stats, friendship status, shared communities in parallel
  const [statsRows, friendshipRows, sharedCommunitiesRows, battleTagRows] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM friendships f WHERE f.status = 'accepted'
          AND (f.sender_id = ${userId} OR f.receiver_id = ${userId})) AS friend_count,
        (SELECT COUNT(*)::int FROM community_members cm WHERE cm.user_id = ${userId} AND cm.status = 'active') AS community_count,
        (SELECT COUNT(*)::int FROM game_session_participations gsp
          JOIN game_sessions gs ON gs.id = gsp.session_id
          WHERE gsp.user_id = ${userId}) AS session_count,
        (SELECT COUNT(*)::int FROM event_participations ep WHERE ep.user_id = ${userId} AND ep.status = 'accepted') AS event_count
    `),
    db.execute(sql`
      SELECT sender_id, receiver_id, status
      FROM friendships
      WHERE (sender_id = ${me} AND receiver_id = ${userId})
         OR (sender_id = ${userId} AND receiver_id = ${me})
      LIMIT 1
    `),
    db.execute(sql`
      SELECT c.id, c.name
      FROM communities c
      JOIN community_members cm1 ON cm1.community_id = c.id AND cm1.user_id = ${me} AND cm1.status = 'active'
      JOIN community_members cm2 ON cm2.community_id = c.id AND cm2.user_id = ${userId} AND cm2.status = 'active'
      LIMIT 5
    `),
    db.execute(sql`
      SELECT platform, tag
      FROM user_battle_tags
      WHERE user_id = ${userId} AND is_public = true
      ORDER BY platform
    `)
  ])

  const stats = (statsRows.rows ?? statsRows)[0]
  const friendship = (friendshipRows.rows ?? friendshipRows)[0] as any
  const sharedCommunities = sharedCommunitiesRows.rows ?? sharedCommunitiesRows
  const battleTags = battleTagRows.rows ?? battleTagRows

  // Determine friendship status
  let friendshipStatus: 'none' | 'friends' | 'pending_sent' | 'pending_received' = 'none'
  if (friendship) {
    if (friendship.status === 'accepted') {
      friendshipStatus = 'friends'
    } else if (friendship.status === 'pending') {
      friendshipStatus = friendship.sender_id === me ? 'pending_sent' : 'pending_received'
    }
  }

  return {
    id: target.id,
    username: target.username,
    image: target.image,
    createdAt: target.created_at,
    stats,
    friendshipStatus,
    sharedCommunities,
    battleTags,
    isSelf: me === userId
  }
})
