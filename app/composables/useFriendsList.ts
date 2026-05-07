type Friend = {
  id: string
  username: string
  name: string
  image: string | null
  isOnline: boolean
  isAvailable: boolean
  inSession: boolean
  availableGameId: number | null
  sessionId: string | null
  sessionGameName: string | null
  notifDisabled: boolean
}

type PendingRequest = {
  senderId: string
  senderUsername: string
  senderImage: string | null
  [k: string]: unknown
}

export const useFriendsList = () => {
  const friends = useState<Friend[]>('friends-list', () => [])
  const mySessionId = useState<string | null>('friends-my-session', () => null)
  const pendingRequests = useState<PendingRequest[]>('friends-pending', () => [])
  const initialized = useState('friends-initialized', () => false)

  async function fetchFriends() {
    try {
      const data = await $fetch<{ friends: Friend[], mySessionId: string | null }>('/api/friends')
      friends.value = data.friends
      mySessionId.value = data.mySessionId
    } catch {
      friends.value = []
    }
  }

  async function fetchPending() {
    try {
      pendingRequests.value = await $fetch<PendingRequest[]>('/api/friends/pending')
    } catch {
      pendingRequests.value = []
    }
  }

  async function respondToRequest(senderId: string, action: 'accept' | 'reject') {
    await $fetch(`/api/friends/${senderId}/respond`, {
      method: 'POST',
      body: { action }
    })
    await Promise.all([fetchFriends(), fetchPending()])
  }

  async function toggleNotif(friendId: string, disabled: boolean) {
    await $fetch(`/api/friends/${friendId}/notif`, {
      method: 'PATCH',
      body: { disabled }
    })
    const friend = friends.value.find(f => f.id === friendId)
    if (friend) friend.notifDisabled = disabled
  }

  // Initialise les fetchs + abonnements WS + polling. Idempotent : appelable
  // depuis n'importe où, ne s'exécute qu'une seule fois sur la durée de vie
  // de l'app. À appeler depuis le layout (toujours monté quand connecté).
  function init() {
    if (initialized.value) return
    initialized.value = true

    const { user } = useAuth()
    const { connect, on } = useWebSocket()

    // Premier fetch dès qu'un utilisateur est connu
    watch(() => user.value?.id, (id) => {
      if (!id) return
      connect(id)
      // léger délai pour laisser la WS s'établir avant le fetch
      setTimeout(() => Promise.all([fetchFriends(), fetchPending()]), 1000)
    }, { immediate: true })

    on('availability:update', () => fetchFriends())
    on('session:update', () => fetchFriends())

    const pollInterval = setInterval(fetchFriends, 30000)
    if (getCurrentScope()) {
      onScopeDispose(() => clearInterval(pollInterval))
    }
  }

  return {
    friends,
    mySessionId,
    pendingRequests,
    fetchFriends,
    fetchPending,
    respondToRequest,
    toggleNotif,
    init
  }
}
