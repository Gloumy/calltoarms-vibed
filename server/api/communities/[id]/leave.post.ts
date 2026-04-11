import { eq, and, ne } from 'drizzle-orm'
import { communities, communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Check membership
  const [membership] = await db
    .select({ role: communityMembers.role, status: communityMembers.status })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (!membership || membership.status !== 'active') {
    throw createError({ statusCode: 400, statusMessage: 'Vous n\'etes pas membre' })
  }

  // Check if sole admin — need to promote someone or delete community
  if (membership.role === 'admin') {
    const otherAdmins = await db
      .select({ userId: communityMembers.userId })
      .from(communityMembers)
      .where(and(
        eq(communityMembers.communityId, id),
        eq(communityMembers.role, 'admin'),
        eq(communityMembers.status, 'active'),
        ne(communityMembers.userId, me)
      ))

    if (otherAdmins.length === 0) {
      // No other admins — try to promote oldest active non-admin member
      const [nextMember] = await db
        .select({ userId: communityMembers.userId })
        .from(communityMembers)
        .where(and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.status, 'active'),
          ne(communityMembers.userId, me)
        ))
        .limit(1)

      if (!nextMember) {
        // Last member — delete community
        await db.delete(communityMembers).where(eq(communityMembers.communityId, id))
        await db.delete(communities).where(eq(communities.id, id))
        return { success: true, deleted: true }
      }

      // Promote next member
      await db.update(communityMembers)
        .set({ role: 'admin' })
        .where(and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.userId, nextMember.userId)
        ))
    }
  }

  await db.delete(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))

  return { success: true }
})
