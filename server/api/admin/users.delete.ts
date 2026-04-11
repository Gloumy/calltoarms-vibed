import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const db = useDB()

  const { userId } = await readBody(event)

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId requis' })
  }

  if (userId === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'Impossible de se supprimer soi-meme' })
  }

  // Check target exists
  const [target] = await db
    .select({ id: user.id, isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })
  }

  if (target.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Impossible de supprimer un autre admin' })
  }

  // Cascade will handle related data
  await db.delete(user).where(eq(user.id, userId))

  return { success: true }
})
