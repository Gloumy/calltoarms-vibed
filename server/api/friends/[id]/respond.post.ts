import { eq, and } from 'drizzle-orm'
import { friendships } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const senderId = getRouterParam(event, 'id')
  const { action } = await readBody(event)

  if (!senderId) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  if (!['accept', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Action invalide (accept/reject)' })
  }

  // Find the pending request where I'm the receiver
  const [request] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.senderId, senderId),
        eq(friendships.receiverId, me),
        eq(friendships.status, 'pending')
      )
    )
    .limit(1)

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  }

  await db
    .update(friendships)
    .set({
      status: action === 'accept' ? 'accepted' : 'rejected',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(friendships.senderId, senderId),
        eq(friendships.receiverId, me)
      )
    )

  // Notify the sender if accepted
  if (action === 'accept') {
    await notifyUser(senderId, 'friend_accepted', {
      title: 'Demande acceptée',
      body: `${session.user.username} a accepté ta demande d'ami`,
      url: '/'
    }, { acceptedBy: me, acceptedByUsername: session.user.username })
  }

  return { success: true, status: action === 'accept' ? 'accepted' : 'rejected' }
})
