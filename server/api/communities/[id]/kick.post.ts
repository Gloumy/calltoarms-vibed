import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const { userId } = await readBody(event)

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId requis' })
  }

  if (userId === me) {
    throw createError({ statusCode: 400, statusMessage: 'Utilisez le bouton quitter' })
  }

  // Check admin/moderator role
  const [myMembership] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (!myMembership || !['admin', 'moderator'].includes(myMembership.role!)) {
    throw createError({ statusCode: 403, statusMessage: 'Seuls les admins et moderateurs peuvent exclure' })
  }

  // Check target membership
  const [target] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, userId)
    ))
    .limit(1)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Membre introuvable' })
  }

  // Can't kick an admin unless you're also admin
  if (target.role === 'admin' && myMembership.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Un moderateur ne peut pas exclure un admin' })
  }

  // Can't kick another admin if they are the creator
  const [community] = await db
    .select({ createdBy: communities.createdBy })
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1)

  if (userId === community?.createdBy) {
    throw createError({ statusCode: 403, statusMessage: 'Impossible d\'exclure le createur' })
  }

  await db.delete(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, userId)
    ))

  return { success: true }
})
