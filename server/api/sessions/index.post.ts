import { gameSessions, gameSessionParticipations } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const body = await readBody(event)
  const { gameId, communityId, visibility = 'friends', durationMinutes = 120, maxPlayers, discussion } = body

  if (!['friends', 'community', 'public'].includes(visibility)) {
    throw createError({ statusCode: 400, statusMessage: 'Visibilite invalide' })
  }

  if (visibility === 'community' && !communityId) {
    throw createError({ statusCode: 400, statusMessage: 'Communaute requise pour la visibilite communaute' })
  }

  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60000)
    : new Date(Date.now() + 24 * 60 * 60000) // 24h max if "no limit"

  const id = crypto.randomUUID()

  await db.insert(gameSessions).values({
    id,
    createdBy: me,
    gameId: gameId ?? null,
    communityId: communityId ?? null,
    visibility,
    status: 'active',
    maxPlayers: maxPlayers ?? null,
    expiresAt,
    discussion: discussion ?? null
  })

  // Creator auto-joins
  await db.insert(gameSessionParticipations).values({
    sessionId: id,
    userId: me
  })

  const username = session.user.username || session.user.name

  if (communityId) {
    // Notify community members
    await broadcastToCommunityMembers(communityId, {
      type: 'session:update',
      payload: { id, createdBy: me, communityId }
    }, me)
  }

  // Always notify friends
  const friendIds = await getFriendIds(me)
  await Promise.all(
    friendIds.map(friendId =>
      notifyUser(friendId, 'session_started', {
        title: 'Nouvelle session',
        body: `${username} lance une session !`,
        url: '/'
      }, { sessionId: id, creatorId: me, creatorName: username, gameId })
    )
  )

  // Broadcast via WebSocket to friends
  await broadcastToFriends(me, {
    type: 'session:update',
    payload: { id, createdBy: me }
  })

  return { id }
})
