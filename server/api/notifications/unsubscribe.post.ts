import { sql, and, eq } from 'drizzle-orm'
import { pushSubscriptions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const body = await readBody(event)

  if (!body?.endpoint) {
    throw createError({ statusCode: 400, statusMessage: 'Endpoint requis' })
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        sql`${pushSubscriptions.subscription}->>'endpoint' = ${body.endpoint}`
      )
    )

  return { success: true }
})
