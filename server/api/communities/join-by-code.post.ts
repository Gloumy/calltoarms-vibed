import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const { code } = await readBody(event)

  if (!code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Code d\'invitation requis' })
  }

  // Find community by invite code
  const [community] = await db
    .select({ id: communities.id, name: communities.name })
    .from(communities)
    .where(eq(communities.inviteCode, code.trim()))
    .limit(1)

  if (!community) {
    throw createError({ statusCode: 404, statusMessage: 'Code d\'invitation invalide' })
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, community.id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (existing) {
    return { success: true, communityId: community.id, alreadyMember: true }
  }

  await db.insert(communityMembers).values({
    communityId: community.id,
    userId: me,
    role: 'member',
    notifPreference: 'all'
  })

  return { success: true, communityId: community.id }
})
