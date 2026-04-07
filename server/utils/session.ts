import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event) {
  const auth = useServerAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }

  return session
}
