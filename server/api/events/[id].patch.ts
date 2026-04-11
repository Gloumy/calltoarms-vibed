import { eq } from 'drizzle-orm'
import { events } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const id = getRouterParam(event, 'id')!

  const [existing] = await db
    .select({ createdBy: events.createdBy })
    .from(events)
    .where(eq(events.id, id))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Evenement introuvable' })
  }
  if (existing.createdBy !== me) {
    throw createError({ statusCode: 403, statusMessage: 'Non autorise' })
  }

  const body = await readBody(event)
  const updates: Record<string, any> = {}

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.scheduledAt !== undefined) updates.scheduledAt = new Date(body.scheduledAt)
  if (body.discussion !== undefined) updates.discussion = body.discussion?.trim() || null
  if (body.gameId !== undefined) updates.gameId = body.gameId ?? null

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Rien a modifier' })
  }

  await db.update(events).set(updates).where(eq(events.id, id))

  return { success: true }
})
