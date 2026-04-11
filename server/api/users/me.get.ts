import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()

  const [userData] = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  return {
    ...session.user,
    isAdmin: userData?.isAdmin ?? false
  }
})
