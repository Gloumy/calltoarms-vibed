import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts } from '../../../db/schema'
import { SteamService } from '../../../services/platforms/steam/SteamService'

const REQUIRED_OPENID_FIELDS = [
  'openid.ns', 'openid.mode', 'openid.op_endpoint', 'openid.claimed_id',
  'openid.identity', 'openid.return_to', 'openid.response_nonce',
  'openid.assoc_handle', 'openid.signed', 'openid.sig'
] as const

export default defineEventHandler(async (event) => {
  const baseUrl = requireBaseUrl()

  try {
    const session = await requireAuth(event)
    const userId = session.user.id
    const query = getQuery(event)

    for (const field of REQUIRED_OPENID_FIELDS) {
      if (typeof query[field] !== 'string') {
        throw createError({ statusCode: 400, statusMessage: `Champ OpenID manquant: ${field}` })
      }
    }

    // Verify the assertion by re-posting to Steam with mode=check_authentication.
    // This is what actually proves the user owns the Steam ID — never trust the query alone.
    const verificationParams = new URLSearchParams({
      ...(query as Record<string, string>),
      'openid.mode': 'check_authentication'
    })
    const verificationResponse = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://steamcommunity.com',
        'Referer': 'https://steamcommunity.com/'
      },
      body: verificationParams
    })
    const verificationText = await verificationResponse.text()
    if (!verificationText.includes('is_valid:true')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentification Steam invalide' })
    }

    const steamId = (query['openid.claimed_id'] as string).split('/').pop()
    if (!steamId || !/^\d{17}$/.test(steamId)) {
      throw createError({ statusCode: 400, statusMessage: 'Steam ID invalide' })
    }

    const steamService = new SteamService()
    const authResult = await steamService.authenticate({ steamId })
    if (!authResult.success) {
      throw createError({ statusCode: 400, statusMessage: authResult.error })
    }

    const db = useDB()
    const profile = authResult.data

    const [existing] = await db
      .select()
      .from(userPlatformAccounts)
      .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'steam')))
      .limit(1)

    if (existing) {
      await db
        .update(userPlatformAccounts)
        .set({
          platformId: profile.platformId,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          profileUrl: profile.profileUrl,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(userPlatformAccounts.id, existing.id))
    } else {
      await db.insert(userPlatformAccounts).values({
        id: crypto.randomUUID(),
        userId,
        platform: 'steam',
        platformId: profile.platformId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        isActive: true
      })
    }

    await sendRedirect(event, `${baseUrl}/library?steam_connected=true`)
  } catch (error) {
    const message = error && typeof error === 'object' && 'statusMessage' in error
      ? String((error as { statusMessage: unknown }).statusMessage)
      : 'Erreur interne du serveur'
    await sendRedirect(event, `${baseUrl}/library?steam_error=${encodeURIComponent(message)}`)
  }
})
