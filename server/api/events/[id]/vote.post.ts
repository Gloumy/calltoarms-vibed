import { eq, and } from 'drizzle-orm'
import { eventPollOptions, eventPollVotes, eventPolls, events } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const eventId = getRouterParam(event, 'id')!

  const { optionId } = await readBody(event)

  if (!optionId) {
    throw createError({ statusCode: 400, statusMessage: 'optionId requis' })
  }

  // Verify option exists and belongs to this event
  const [option] = await db
    .select({
      id: eventPollOptions.id,
      pollId: eventPollOptions.pollId
    })
    .from(eventPollOptions)
    .innerJoin(eventPolls, eq(eventPolls.id, eventPollOptions.pollId))
    .where(
      and(
        eq(eventPollOptions.id, optionId),
        eq(eventPolls.eventId, eventId)
      )
    )
    .limit(1)

  if (!option) {
    throw createError({ statusCode: 404, statusMessage: 'Option introuvable' })
  }

  // Remove previous vote on this poll (one vote per poll)
  const existingVotes = await db
    .select({ optionId: eventPollVotes.optionId })
    .from(eventPollVotes)
    .innerJoin(eventPollOptions, eq(eventPollOptions.id, eventPollVotes.optionId))
    .where(
      and(
        eq(eventPollOptions.pollId, option.pollId),
        eq(eventPollVotes.userId, me)
      )
    )

  for (const vote of existingVotes) {
    await db.delete(eventPollVotes).where(
      and(
        eq(eventPollVotes.optionId, vote.optionId),
        eq(eventPollVotes.userId, me)
      )
    )
  }

  // If clicking the same option, just remove (toggle)
  if (existingVotes.some(v => v.optionId === optionId)) {
    return { success: true, toggled: 'off' }
  }

  // Insert new vote
  await db.insert(eventPollVotes).values({
    optionId,
    userId: me
  })

  return { success: true, toggled: 'on' }
})
