import { eq } from 'drizzle-orm'
import { events, eventPolls, eventPollOptions } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { question, options } = await readBody(event)

  if (!question?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Question requise' })
  }
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Au moins 2 options requises' })
  }

  // Verify event exists and user is creator
  const [eventData] = await db
    .select({ createdBy: events.createdBy })
    .from(events)
    .where(eq(events.id, id))
    .limit(1)

  if (!eventData) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }
  if (eventData.createdBy !== me) {
    throw createError({ statusCode: 403, statusMessage: 'Seul le createur peut ajouter un sondage' })
  }

  const pollId = crypto.randomUUID()

  await db.insert(eventPolls).values({
    id: pollId,
    eventId: id,
    question: question.trim()
  })

  await db.insert(eventPollOptions).values(
    options.map((label: string) => ({
      id: crypto.randomUUID(),
      pollId,
      label: label.trim()
    }))
  )

  return { id: pollId }
})
