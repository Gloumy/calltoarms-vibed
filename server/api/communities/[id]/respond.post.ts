import { eq, and } from 'drizzle-orm'
import { communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { accept } = await readBody(event)

  // Check pending invite
  const [membership] = await db
    .select({ status: communityMembers.status })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (!membership || membership.status !== 'invited') {
    throw createError({ statusCode: 400, statusMessage: 'Aucune invitation en attente' })
  }

  if (accept) {
    await db.update(communityMembers)
      .set({ status: 'active', joinedAt: new Date() })
      .where(and(
        eq(communityMembers.communityId, id),
        eq(communityMembers.userId, me)
      ))
  } else {
    await db.update(communityMembers)
      .set({ status: 'declined' })
      .where(and(
        eq(communityMembers.communityId, id),
        eq(communityMembers.userId, me)
      ))
  }

  return { success: true }
})
