import type { Peer } from 'crossws'

const peers = new Map<string, { peer: Peer; userId: string }>()

export default defineWebSocketHandler({
  open(peer) {
    // Try multiple ways to get the userId from the connection URL
    let userId: string | null = null

    try {
      const rawUrl = peer.request?.url || peer.url || ''
      if (rawUrl.includes('userId=')) {
        const url = new URL(rawUrl, 'http://localhost')
        userId = url.searchParams.get('userId')
      }
    } catch {
      // fallback: parse manually
      const rawUrl = String(peer.request?.url || peer.url || '')
      const match = rawUrl.match(/userId=([^&]+)/)
      userId = match ? match[1] : null
    }

    if (userId) {
      peers.set(peer.id, { peer, userId })
      peer.subscribe(`user:${userId}`)
    }
  },

  close(peer) {
    peers.delete(peer.id)
  },

  message(peer, message) {
    // Handle userId sent via message as fallback
    try {
      const data = JSON.parse(String(message))
      if (data.type === 'auth' && data.userId) {
        peers.set(peer.id, { peer, userId: data.userId })
        peer.subscribe(`user:${data.userId}`)
      }
    } catch {
      // ignore
    }
  }
})

export { peers }

export function getOnlineUserIds(): Set<string> {
  const ids = new Set<string>()
  for (const [, { userId }] of peers) {
    ids.add(userId)
  }
  return ids
}
