import { eq } from 'drizzle-orm'
import { gameSessions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  // Verify ownership
  const [existing] = await db
    .select({ createdBy: gameSessions.createdBy })
    .from(gameSessions)
    .where(eq(gameSessions.id, id))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }
  if (existing.createdBy !== me) {
    throw createError({ statusCode: 403, statusMessage: 'Non autorise' })
  }

  const body = await readBody(event)
  const updates: Record<string, any> = {}

  if (body.status && ['active', 'closed'].includes(body.status)) {
    updates.status = body.status
  }
  if (body.maxPlayers !== undefined) {
    updates.maxPlayers = body.maxPlayers
  }
  if (body.discussion !== undefined) {
    updates.discussion = body.discussion
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Rien a modifier' })
  }

  await db.update(gameSessions).set(updates).where(eq(gameSessions.id, id))

  return { success: true }
})
