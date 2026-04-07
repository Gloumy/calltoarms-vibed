import { eq, and, or } from 'drizzle-orm'
import { friendships, user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const { username } = await readBody(event)

  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Nom d\'utilisateur requis' })
  }

  // Find target user
  const [target] = await db
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })
  }

  if (target.id === me) {
    throw createError({ statusCode: 400, statusMessage: 'Tu ne peux pas t\'ajouter toi-même' })
  }

  // Check if friendship already exists
  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.senderId, me), eq(friendships.receiverId, target.id)),
        and(eq(friendships.senderId, target.id), eq(friendships.receiverId, me))
      )
    )
    .limit(1)

  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Demande déjà envoyée ou déjà amis' })
  }

  // Create friendship request
  await db.insert(friendships).values({
    senderId: me,
    receiverId: target.id,
    status: 'pending'
  })

  // Notify the receiver
  await notifyUser(target.id, 'friend_request', {
    title: 'Demande d\'ami',
    body: `${session.user.username} veut t'ajouter en ami`,
    url: '/'
  }, { senderId: me, senderUsername: session.user.username })

  return { success: true, message: `Demande envoyée à ${target.username}` }
})
