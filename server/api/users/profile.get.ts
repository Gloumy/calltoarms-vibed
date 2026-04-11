import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  // Get stats
  const stats = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM friendships f WHERE f.status = 'accepted'
        AND (f.sender_id = ${me} OR f.receiver_id = ${me})) AS friend_count,
      (SELECT COUNT(*)::int FROM community_members cm WHERE cm.user_id = ${me} AND cm.status = 'active') AS community_count,
      (SELECT COUNT(*)::int FROM game_session_participations gsp
        JOIN game_sessions gs ON gs.id = gsp.session_id
        WHERE gsp.user_id = ${me}) AS session_count,
      (SELECT COUNT(*)::int FROM event_participations ep WHERE ep.user_id = ${me} AND ep.status = 'accepted') AS event_count,
      (SELECT COUNT(*)::int FROM user_favorited_games uf WHERE uf.user_id = ${me}) AS favorite_game_count
  `)

  // Get battle tags
  const battleTags = await db.execute(sql`
    SELECT id, platform, tag, is_public
    FROM user_battle_tags
    WHERE user_id = ${me}
    ORDER BY platform
  `)

  return {
    user: {
      id: session.user.id,
      username: session.user.username || session.user.name,
      email: session.user.email,
      image: session.user.image,
      createdAt: session.user.createdAt
    },
    stats: (stats.rows ?? stats)[0],
    battleTags: battleTags.rows ?? battleTags
  }
})
