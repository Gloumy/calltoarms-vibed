import { eq, and } from 'drizzle-orm'
import { events, eventParticipations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { status } = await readBody(event)

  if (!['accepted', 'declined', 'maybe'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Statut invalide (accepted | declined | maybe)' })
  }

  // Verify event exists
  const [eventData] = await db
    .select({ id: events.id, createdBy: events.createdBy })
    .from(events)
    .where(eq(events.id, id))
    .limit(1)

  if (!eventData) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }

  // Upsert participation
  const [existing] = await db
    .select()
    .from(eventParticipations)
    .where(
      and(
        eq(eventParticipations.eventId, id),
        eq(eventParticipations.userId, me)
      )
    )
    .limit(1)

  if (existing) {
    await db.update(eventParticipations)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(eventParticipations.eventId, id),
          eq(eventParticipations.userId, me)
        )
      )
  } else {
    await db.insert(eventParticipations).values({
      eventId: id,
      userId: me,
      status
    })
  }

  return { success: true }
})
