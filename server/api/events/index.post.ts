import { events, eventParticipations } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const username = session.user.username || session.user.name

  const body = await readBody(event)
  const { title, description, gameId, communityId, visibility = 'friends', scheduledAt, discussion, invitedUserIds } = body

  if (!title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
  }
  if (!scheduledAt) {
    throw createError({ statusCode: 400, statusMessage: 'Date requise' })
  }

  if (!['friends', 'community', 'public', 'invite_only'].includes(visibility)) {
    throw createError({ statusCode: 400, statusMessage: 'Visibilite invalide' })
  }

  const id = crypto.randomUUID()

  await db.insert(events).values({
    id,
    createdBy: me,
    communityId: communityId ?? null,
    gameId: gameId ?? null,
    title: title.trim(),
    description: description?.trim() || null,
    visibility,
    scheduledAt: new Date(scheduledAt),
    discussion: discussion?.trim() || null
  })

  // Creator auto-accepts
  await db.insert(eventParticipations).values({
    eventId: id,
    userId: me,
    status: 'accepted'
  })

  // Determine who to invite
  const friendIds = await getFriendIds(me)

  if (visibility === 'invite_only' && Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
    // Only invite selected users
    const toInvite = invitedUserIds.filter((uid: string) => uid !== me)
    if (toInvite.length > 0) {
      await db.insert(eventParticipations).values(
        toInvite.map((uid: string) => ({
          eventId: id,
          userId: uid,
          status: 'invited'
        }))
      )
      await Promise.all(
        toInvite.map((uid: string) =>
          notifyUser(uid, 'event_invited', {
            title: 'Invitation a un evenement',
            body: `${username} t'a invite a "${title.trim()}"`,
            url: `/events/${id}`
          }, { eventId: id, creatorId: me, creatorName: username })
        )
      )
    }
  } else {
    // Notify all friends
    await Promise.all(
      friendIds.map(friendId =>
        notifyUser(friendId, 'event_created', {
          title: 'Nouvel evenement',
          body: `${username} a cree "${title.trim()}"`,
          url: `/events/${id}`
        }, { eventId: id, creatorId: me, creatorName: username })
      )
    )
  }

  await broadcastToFriends(me, {
    type: 'event:update',
    payload: { id, createdBy: me }
  })

  return { id }
})
