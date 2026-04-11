import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Check admin/moderator role
  const [membership] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (!membership || !['admin', 'moderator'].includes(membership.role!)) {
    throw createError({ statusCode: 403, statusMessage: 'Seuls les admins et moderateurs peuvent generer un lien' })
  }

  // Get or generate invite code
  const [community] = await db
    .select({ inviteCode: communities.inviteCode })
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1)

  if (!community) {
    throw createError({ statusCode: 404, statusMessage: 'Communaute introuvable' })
  }

  let inviteCode = community.inviteCode

  const { regenerate } = await readBody(event).catch(() => ({ regenerate: false }))

  if (!inviteCode || regenerate) {
    inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    await db.update(communities)
      .set({ inviteCode })
      .where(eq(communities.id, id))
  }

  return { inviteCode }
})
