import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  const [game] = await db
    .select({ id: userPlatformGames.id })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformAccounts.id, userPlatformGames.platformAccountId))
    .where(and(
      eq(userPlatformGames.id, id),
      eq(userPlatformAccounts.userId, userId),
      eq(userPlatformAccounts.platform, 'manual')
    ))
    .limit(1)

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Jeu manuel introuvable' })
  }

  await db.delete(userPlatformGames).where(eq(userPlatformGames.id, id))
  return { success: true }
})
