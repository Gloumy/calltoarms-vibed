import { eq, and } from 'drizzle-orm'
import { communities, communityMembers } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Check admin role
  const [membership] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, me)
    ))
    .limit(1)

  if (!membership || membership.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Seuls les admins peuvent modifier la communaute' })
  }

  const { name, description, gameId, isPublic } = await readBody(event)

  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (gameId !== undefined) updates.gameId = gameId
  if (isPublic !== undefined) updates.isPublic = isPublic

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune modification' })
  }

  await db.update(communities).set(updates).where(eq(communities.id, id))

  return { success: true }
})
