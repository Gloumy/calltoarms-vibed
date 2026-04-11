import { eq, and } from 'drizzle-orm'
import { communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { preference } = await readBody(event)

  if (!['all', 'friends_only', 'none'].includes(preference)) {
    throw createError({ statusCode: 400, statusMessage: 'Preference invalide (all | friends_only | none)' })
  }

  const result = await db.update(communityMembers)
    .set({ notifPreference: preference })
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))

  return { success: true }
})
