import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts, userPlatformGames } from '../../../db/schema'

interface PatchBody {
  name?: string
  playtimeTotal?: number
  isCompleted?: boolean
  completedAt?: string | null
  lastPlayed?: string | null
  iconUrl?: string | null
  coverUrl?: string | null
}

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  // Verify ownership AND that this is actually a manual entry — protects against
  // PATCHing Steam/PSN/Xbox rows through the manual endpoint.
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

  const body = await readBody<PatchBody>(event)
  const updates: Partial<typeof userPlatformGames.$inferInsert> = { updatedAt: new Date() }

  if (typeof body?.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body?.playtimeTotal === 'number') updates.playtimeTotal = Math.max(0, body.playtimeTotal)
  if (typeof body?.isCompleted === 'boolean') {
    updates.isCompleted = body.isCompleted
    if (!body.isCompleted) updates.completedAt = null
  }
  if (body?.completedAt !== undefined) {
    updates.completedAt = body.completedAt ? new Date(body.completedAt) : null
  }
  if (body?.lastPlayed !== undefined) {
    updates.lastPlayed = body.lastPlayed ? new Date(body.lastPlayed) : null
  }
  if (body?.iconUrl !== undefined) updates.iconUrl = body.iconUrl
  if (body?.coverUrl !== undefined) updates.coverUrl = body.coverUrl

  await db.update(userPlatformGames).set(updates).where(eq(userPlatformGames.id, id))

  return { success: true }
})
