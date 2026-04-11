import { eq } from 'drizzle-orm'
import { user } from '../db/schema'
import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const session = await requireAuth(event)
  const db = useDB()

  const [userData] = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (!userData?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Acces administrateur requis' })
  }

  return session
}
