import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const { username, image } = await readBody(event)

  const updates: Record<string, any> = {}
  if (username !== undefined) {
    if (!username?.trim() || username.trim().length < 3) {
      throw createError({ statusCode: 400, statusMessage: 'Le pseudo doit faire au moins 3 caracteres' })
    }
    updates.username = username.trim()
    updates.name = username.trim()
  }
  if (image !== undefined) {
    updates.image = image || null
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune modification' })
  }

  updates.updatedAt = new Date()

  try {
    await db.update(user).set(updates).where(eq(user.id, me))
  } catch (e: any) {
    if (e.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Ce pseudo est deja pris' })
    }
    throw e
  }

  return { success: true }
})
