import { eq } from 'drizzle-orm'
import { user, games } from '../../db/schema'
import { getOnlineUserIds } from '../../routes/_ws'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const username = session.user.username || session.user.name

  const body = await readBody(event)
  const { gameId, durationMinutes = 120, clear } = body

  // Clear availability
  if (clear) {
    await db.update(user)
      .set({ availableUntil: null, availableGameId: null })
      .where(eq(user.id, me))

    await broadcastToFriends(me, {
      type: 'availability:update',
      payload: { user_id: me, available_until: null, available_game_id: null }
    })

    return { success: true, available: false }
  }

  // Set availability
  const availableUntil = new Date(Date.now() + durationMinutes * 60000)

  await db.update(user)
    .set({
      availableUntil,
      availableGameId: gameId ?? null
    })
    .where(eq(user.id, me))

  // Get game name if provided
  let gameName = ''
  if (gameId) {
    const [game] = await db.select({ name: games.name }).from(games).where(eq(games.id, gameId)).limit(1)
    gameName = game?.name ?? ''
  }

  // Notify online friends only
  const onlineIds = getOnlineUserIds()
  const friendIds = await getFriendIds(me)
  const onlineFriendIds = friendIds.filter(id => onlineIds.has(id))

  await Promise.all(
    onlineFriendIds.map(friendId =>
      notifyUser(friendId, 'availability', {
        title: `${username} est disponible`,
        body: gameName ? `Cherche des joueurs sur ${gameName}` : 'Disponible pour jouer',
        url: '/'
      }, { userId: me, username, gameId, gameName })
    )
  )

  // Broadcast via WebSocket
  await broadcastToFriends(me, {
    type: 'availability:update',
    payload: { user_id: me, available_until: availableUntil, available_game_id: gameId ?? null }
  })

  return { success: true, available: true, availableUntil }
})
