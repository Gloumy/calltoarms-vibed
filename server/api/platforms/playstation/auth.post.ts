import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts } from '../../../db/schema'
import { PlayStationService } from '../../../services/platforms/playstation/PlayStationService'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const body = await readBody<{ npsso?: string, username?: string }>(event)
  const npsso = body?.npsso?.trim()
  if (!npsso) {
    throw createError({ statusCode: 400, statusMessage: 'NPSSO token requis' })
  }

  const service = new PlayStationService()
  const authResult = await service.authenticate({ npsso, username: body?.username ?? '' })
  if (!authResult.success) {
    throw createError({ statusCode: 400, statusMessage: authResult.error })
  }

  const tokens = service.getTokens()
  const profile = authResult.data
  const now = new Date()

  const [existing] = await db
    .select()
    .from(userPlatformAccounts)
    .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'playstation')))
    .limit(1)

  if (existing) {
    await db
      .update(userPlatformAccounts)
      .set({
        platformId: profile.platformId,
        username: profile.username ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        profileUrl: profile.profileUrl ?? null,
        accessToken: npsso,
        refreshToken: tokens?.refreshToken ?? null,
        isActive: true,
        updatedAt: now
      })
      .where(eq(userPlatformAccounts.id, existing.id))

    return { success: true, accountId: existing.id }
  }

  const id = crypto.randomUUID()
  await db.insert(userPlatformAccounts).values({
    id,
    userId,
    platform: 'playstation',
    platformId: profile.platformId,
    username: profile.username ?? null,
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    profileUrl: profile.profileUrl ?? null,
    accessToken: npsso,
    refreshToken: tokens?.refreshToken ?? null,
    isActive: true
  })

  return { success: true, accountId: id }
})
