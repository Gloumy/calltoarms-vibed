import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Check community exists and is public
  const [community] = await db
    .select({ id: communities.id, isPublic: communities.isPublic })
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1)

  if (!community) {
    throw createError({ statusCode: 404, statusMessage: 'Communaute introuvable' })
  }
  if (!community.isPublic) {
    throw createError({ statusCode: 403, statusMessage: 'Communaute privee, impossible de la rejoindre' })
  }

  // Check if already exists
  const [existing] = await db
    .select({ status: communityMembers.status })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (existing) {
    if (existing.status === 'active') {
      return { success: true, alreadyMember: true }
    }
    // Reactivate declined/invited
    await db.update(communityMembers)
      .set({ status: 'active', joinedAt: new Date() })
      .where(and(
        eq(communityMembers.communityId, id),
        eq(communityMembers.userId, me)
      ))
    return { success: true }
  }

  await db.insert(communityMembers).values({
    communityId: id,
    userId: me,
    role: 'member',
    status: 'active',
    notifPreference: 'all'
  })

  return { success: true }
})
