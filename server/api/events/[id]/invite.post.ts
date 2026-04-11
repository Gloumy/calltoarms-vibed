import { eq, and } from 'drizzle-orm'
import { events, eventParticipations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const username = session.user.username || session.user.name
  const id = getRouterParam(event, 'id')!

  const { userIds } = await readBody(event)

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'userIds requis' })
  }

  // Verify event exists and user is owner
  const [eventData] = await db
    .select({ id: events.id, createdBy: events.createdBy, title: events.title })
    .from(events)
    .where(eq(events.id, id))
    .limit(1)

  if (!eventData) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }
  if (eventData.createdBy !== me) {
    throw createError({ statusCode: 403, statusMessage: 'Seul le createur peut inviter' })
  }

  // Get already participating user IDs to skip them
  const existing = await db
    .select({ userId: eventParticipations.userId })
    .from(eventParticipations)
    .where(eq(eventParticipations.eventId, id))

  const existingIds = new Set(existing.map(e => e.userId))
  const newUserIds = userIds.filter((uid: string) => !existingIds.has(uid))

  if (newUserIds.length === 0) {
    return { invited: 0 }
  }

  // Insert invited participations
  await db.insert(eventParticipations).values(
    newUserIds.map((uid: string) => ({
      eventId: id,
      userId: uid,
      status: 'invited'
    }))
  )

  // Notify invited users
  await Promise.all(
    newUserIds.map((uid: string) =>
      notifyUser(uid, 'event_invited', {
        title: 'Invitation a un evenement',
        body: `${username} t'a invite a "${eventData.title}"`,
        url: `/events/${id}`
      }, { eventId: id, creatorId: me, creatorName: username })
    )
  )

  return { invited: newUserIds.length }
})
