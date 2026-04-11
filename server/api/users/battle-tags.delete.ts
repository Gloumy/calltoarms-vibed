import { eq, and } from 'drizzle-orm'
import { userBattleTags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const { id } = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  await db.delete(userBattleTags)
    .where(and(
      eq(userBattleTags.id, id),
      eq(userBattleTags.userId, me)
    ))

  return { success: true }
})
