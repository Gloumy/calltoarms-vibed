import { eq } from 'drizzle-orm'
import { events, eventComments } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { content } = await readBody(event)

  if (!content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Contenu requis' })
  }

  // Verify event exists
  const [eventData] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, id))
    .limit(1)

  if (!eventData) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }

  const commentId = crypto.randomUUID()

  await db.insert(eventComments).values({
    id: commentId,
    eventId: id,
    userId: me,
    content: content.trim()
  })

  return { id: commentId }
})
