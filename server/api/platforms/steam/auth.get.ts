// Initiates the Steam OpenID 2.0 login flow.
// Steam redirects the user back to /api/platforms/steam/callback with signed claims
// that we then verify by posting them back to steamcommunity.com.
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const baseUrl = requireBaseUrl()

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${baseUrl}/api/platforms/steam/callback`,
    'openid.realm': baseUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  })

  await sendRedirect(event, `https://steamcommunity.com/openid/login?${params}`)
})
