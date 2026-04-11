import { eq, sql } from 'drizzle-orm'
import { events, eventParticipations, eventPolls, eventPollOptions, eventPollVotes, eventComments, user, games, communities } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Get event details
  const eventRows = await db.execute(sql`
    SELECT
      e.*,
      u.username AS creator_name,
      u.image AS creator_avatar,
      g.name AS game_name,
      g.cover_url AS game_cover_url,
      c.name AS community_name
    FROM events e
    JOIN "user" u ON u.id = e.created_by
    LEFT JOIN games g ON g.id = e.game_id
    LEFT JOIN communities c ON c.id = e.community_id
    WHERE e.id = ${id}
  `)

  const eventData = (eventRows.rows ?? eventRows)[0] as any
  if (!eventData) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }

  // Get participants
  const participants = await db
    .select({
      userId: eventParticipations.userId,
      status: eventParticipations.status,
      username: user.username,
      image: user.image
    })
    .from(eventParticipations)
    .innerJoin(user, eq(user.id, eventParticipations.userId))
    .where(eq(eventParticipations.eventId, id))

  // Get polls with options and vote counts
  const polls = await db
    .select({
      id: eventPolls.id,
      question: eventPolls.question,
      createdAt: eventPolls.createdAt
    })
    .from(eventPolls)
    .where(eq(eventPolls.eventId, id))

  const pollsWithOptions = await Promise.all(
    polls.map(async (poll) => {
      const options = await db.execute(sql`
        SELECT
          epo.id,
          epo.label,
          COUNT(epv.user_id)::int AS vote_count,
          EXISTS(SELECT 1 FROM event_poll_votes v WHERE v.option_id = epo.id AND v.user_id = ${me}) AS my_vote
        FROM event_poll_options epo
        LEFT JOIN event_poll_votes epv ON epv.option_id = epo.id
        WHERE epo.poll_id = ${poll.id}
        GROUP BY epo.id
      `)
      return { ...poll, options: options.rows ?? options }
    })
  )

  // Get comments
  const comments = await db
    .select({
      id: eventComments.id,
      userId: eventComments.userId,
      content: eventComments.content,
      createdAt: eventComments.createdAt,
      username: user.username,
      userImage: user.image
    })
    .from(eventComments)
    .innerJoin(user, eq(user.id, eventComments.userId))
    .where(eq(eventComments.eventId, id))
    .orderBy(eventComments.createdAt)

  return {
    ...eventData,
    participants,
    polls: pollsWithOptions,
    comments
  }
})
