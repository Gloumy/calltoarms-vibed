// Returns the configured public base URL, throwing 500 if missing.
// OAuth flows (Steam OpenID, Xbox/Microsoft) need this to match the redirect URI
// registered with the provider — silently falling back to localhost masks misconfig
// in staging/prod with confusing "redirect_uri mismatch" errors from the IdP.
export function requireBaseUrl(): string {
  const baseUrl = useRuntimeConfig().baseUrl
  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_BASE_URL is not configured'
    })
  }
  return baseUrl
}
