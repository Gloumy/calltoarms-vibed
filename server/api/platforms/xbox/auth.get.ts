import { createHash, randomBytes } from 'node:crypto'

const COOKIE_TTL = 60 * 10 // 10 minutes

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const config = useRuntimeConfig()
  if (!config.microsoftClientId) {
    throw createError({ statusCode: 500, statusMessage: 'Microsoft client ID non configuré' })
  }

  const baseUrl = requireBaseUrl()
  const state = randomBytes(16).toString('hex')
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  setCookie(event, 'xbox_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_TTL
  })
  setCookie(event, 'xbox_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_TTL
  })

  const authUrl = new URL('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize')
  authUrl.searchParams.set('client_id', config.microsoftClientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', `${baseUrl}/api/platforms/xbox/callback`)
  authUrl.searchParams.set('scope', 'Xboxlive.signin offline_access')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_mode', 'query')
  authUrl.searchParams.set('prompt', 'select_account')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  await sendRedirect(event, authUrl.toString())
})
