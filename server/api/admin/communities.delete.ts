import { eq } from 'drizzle-orm'
import { communities, communityMembers } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDB()

  const { communityId } = await readBody(event)

  if (!communityId) {
    throw createError({ statusCode: 400, statusMessage: 'communityId requis' })
  }

  await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId))
  await db.delete(communities).where(eq(communities.id, communityId))

  return { success: true }
})
