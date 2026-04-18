import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { identifier, password } = body

  if (!identifier || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant et mot de passe requis' })
  }

  let email = identifier

  // If the identifier doesn't look like an email, treat it as a username
  if (!identifier.includes('@')) {
    const db = useDB()
    const found = await db.select({ email: user.email }).from(user).where(eq(user.username, identifier)).limit(1)
    if (!found.length) {
      throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides' })
    }
    email = found[0].email
  }

  // Forward to better-auth's sign-in endpoint
  const auth = useServerAuth()
  const request = new Request(new URL('/api/auth/sign-in/email', getRequestURL(event).origin), {
    method: 'POST',
    headers: event.headers,
    body: JSON.stringify({ email, password })
  })

  const response = await auth.handler(request)

  // Copy response headers (especially set-cookie)
  for (const [key, value] of response.headers.entries()) {
    appendResponseHeader(event, key, value)
  }

  setResponseStatus(event, response.status)
  return response.json()
})
