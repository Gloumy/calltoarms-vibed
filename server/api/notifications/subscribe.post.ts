import { pushSubscriptions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const subscription = await readBody(event)

  if (!subscription?.endpoint) {
    throw createError({ statusCode: 400, statusMessage: 'Subscription invalide' })
  }

  await db.insert(pushSubscriptions).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    subscription
  })

  return { success: true }
})
