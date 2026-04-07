type WSMessage = {
  type: string
  payload: any
}

type WSCallback = (message: WSMessage) => void

export const useWebSocket = () => {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const connected = useState('ws-connected', () => false)
  const listeners = useState<Map<string, Set<WSCallback>>>('ws-listeners', () => new Map())

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = (userId: string) => {
    if (ws.value?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/_ws?userId=${userId}`

    const socket = new WebSocket(url)

    socket.onopen = () => {
      connected.value = true
      // Send auth message as fallback in case URL params aren't available server-side
      socket.send(JSON.stringify({ type: 'auth', userId }))
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        const callbacks = listeners.value.get(message.type)
        if (callbacks) {
          callbacks.forEach(cb => cb(message))
        }
        // Also broadcast to wildcard listeners
        const wildcardCallbacks = listeners.value.get('*')
        if (wildcardCallbacks) {
          wildcardCallbacks.forEach(cb => cb(message))
        }
      } catch {
        // ignore malformed messages
      }
    }

    socket.onclose = () => {
      connected.value = false
      // Auto-reconnect after 3 seconds
      reconnectTimer = setTimeout(() => connect(userId), 3000)
    }

    socket.onerror = () => {
      socket.close()
    }

    ws.value = socket
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws.value?.close()
    ws.value = null
    connected.value = false
  }

  const on = (type: string, callback: WSCallback) => {
    if (!listeners.value.has(type)) {
      listeners.value.set(type, new Set())
    }
    listeners.value.get(type)!.add(callback)

    // Return unsubscribe function
    return () => {
      listeners.value.get(type)?.delete(callback)
    }
  }

  return { connected, connect, disconnect, on }
}
