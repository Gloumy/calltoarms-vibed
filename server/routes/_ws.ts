import type { Peer } from 'crossws'

const peers = new Map<string, { peer: Peer; userId: string }>()

export default defineWebSocketHandler({
  open(peer) {
    const userId = peer.url?.includes('userId=')
      ? new URL(peer.url, 'http://localhost').searchParams.get('userId')
      : null

    if (userId) {
      peers.set(peer.id, { peer, userId })
      peer.subscribe(`user:${userId}`)
    }
  },

  close(peer) {
    peers.delete(peer.id)
  },

  message(_peer, _message) {
    // client → server messages if needed later
  }
})

// Export peers map for use in broadcast util
export { peers }
