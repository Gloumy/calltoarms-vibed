import { and, eq } from 'drizzle-orm'
import { userPlatformAccounts } from '../../../db/schema'
import { XboxService } from '../../../services/platforms/xbox/XboxService'
import type { XboxAccountMetadata } from '../../../services/platforms/xbox/types'

export default defineEventHandler(async (event) => {
  const baseUrl = requireBaseUrl()

  const fail = (reason: string) => sendRedirect(event, `${baseUrl}/library?platform=xbox&xbox_error=${encodeURIComponent(reason)}`)

  try {
    const session = await requireAuth(event)
    const userId = session.user.id

    const query = getQuery(event)
    const code = query.code ? String(query.code) : undefined
    const state = query.state ? String(query.state) : undefined
    const errorDescription = query.error_description ? String(query.error_description) : undefined
    const error = query.error ? String(query.error) : undefined

    if (error) {
      return fail(errorDescription ?? error)
    }

    const savedState = getCookie(event, 'xbox_auth_state')
    const codeVerifier = getCookie(event, 'xbox_code_verifier')
    deleteCookie(event, 'xbox_auth_state')
    deleteCookie(event, 'xbox_code_verifier')

    if (!code) return fail('Code Microsoft manquant')
    if (!savedState || savedState !== state) return fail('State invalide')
    if (!codeVerifier) return fail('PKCE verifier manquant')

    const service = new XboxService()
    const authResult = await service.authenticateWithCode({
      code,
      codeVerifier,
      redirectUri: `${baseUrl}/api/platforms/xbox/callback`
    })
    if (!authResult.success) {
      return fail(authResult.error)
    }

    const profile = authResult.data
    const tokens = service.getTokens()
    if (!tokens) return fail('Tokens Xbox manquants après authentification')

    const metadata: XboxAccountMetadata = {
      userHash: tokens.userHash,
      xuid: tokens.xuid,
      xblUserToken: tokens.xblUserToken,
      msAccessToken: tokens.msAccessToken,
      msTokenExpiresAt: tokens.msTokenExpiresAt,
      xstsTokenExpiresAt: tokens.xstsTokenExpiresAt
    }

    const db = useDB()
    const [existing] = await db
      .select()
      .from(userPlatformAccounts)
      .where(and(eq(userPlatformAccounts.userId, userId), eq(userPlatformAccounts.platform, 'xbox')))
      .limit(1)

    const now = new Date()
    if (existing) {
      await db
        .update(userPlatformAccounts)
        .set({
          platformId: profile.platformId,
          username: profile.username ?? null,
          displayName: profile.displayName ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          profileUrl: profile.profileUrl ?? null,
          accessToken: tokens.xstsToken,
          refreshToken: tokens.msRefreshToken,
          metadata,
          isActive: true,
          updatedAt: now
        })
        .where(eq(userPlatformAccounts.id, existing.id))
    } else {
      await db.insert(userPlatformAccounts).values({
        id: crypto.randomUUID(),
        userId,
        platform: 'xbox',
        platformId: profile.platformId,
        username: profile.username ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        profileUrl: profile.profileUrl ?? null,
        accessToken: tokens.xstsToken,
        refreshToken: tokens.msRefreshToken,
        metadata,
        isActive: true
      })
    }

    return sendRedirect(event, `${baseUrl}/library?platform=xbox&xbox_connected=true`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return fail(message)
  }
})
