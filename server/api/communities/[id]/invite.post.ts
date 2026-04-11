import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const username = session.user.username || session.user.name
  const id = getRouterParam(event, 'id')!

  const { userIds } = await readBody(event)

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'userIds requis' })
  }

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
    throw createError({ statusCode: 403, statusMessage: 'Seuls les admins et moderateurs peuvent inviter' })
  }

  // Get community name for notification
  const [community] = await db
    .select({ name: communities.name })
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1)

  if (!community) {
    throw createError({ statusCode: 404, statusMessage: 'Communaute introuvable' })
  }

  // Filter out already active members or pending invites
  const existing = await db
    .select({ userId: communityMembers.userId, status: communityMembers.status })
    .from(communityMembers)
    .where(eq(communityMembers.communityId, id))

  const skipIds = new Set(
    existing.filter(e => e.status === 'active' || e.status === 'invited').map(e => e.userId)
  )
  const newUserIds = userIds.filter((uid: string) => !skipIds.has(uid))

  if (newUserIds.length === 0) {
    return { invited: 0 }
  }

  // Check if some previously declined — update them back to invited
  const declinedIds = new Set(
    existing.filter(e => e.status === 'declined').map(e => e.userId)
  )

  const toUpdate = newUserIds.filter((uid: string) => declinedIds.has(uid))
  const toInsert = newUserIds.filter((uid: string) => !declinedIds.has(uid))

  if (toUpdate.length > 0) {
    for (const uid of toUpdate) {
      await db.update(communityMembers)
        .set({ status: 'invited' })
        .where(and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.userId, uid)
        ))
    }
  }

  if (toInsert.length > 0) {
    await db.insert(communityMembers).values(
      toInsert.map((uid: string) => ({
        communityId: id,
        userId: uid,
        role: 'member',
        status: 'invited',
        notifPreference: 'all'
      }))
    )
  }

  // Notify invited users
  await Promise.all(
    newUserIds.map((uid: string) =>
      notifyUser(uid, 'community_invited', {
        title: 'Invitation a une communaute',
        body: `${username} t'a invite a rejoindre "${community.name}"`,
        url: `/communities/${id}`
      }, { communityId: id, invitedBy: me, inviterName: username })
    )
  )

  return { invited: newUserIds.length }
})
