function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export const usePushNotifications = () => {
  const subscribed = useState('push-subscribed', () => false)
  const permission = useState<NotificationPermission | 'unsupported'>('push-permission', () => 'default')
  const initialized = useState('push-initialized', () => false)

  const isSupported = computed(() =>
    import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  )

  const refreshPermission = () => {
    if (!isSupported.value) {
      permission.value = 'unsupported'
      return
    }
    permission.value = Notification.permission
  }

  const subscribe = async () => {
    if (!isSupported.value) return false

    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const vapidKey = useRuntimeConfig().public.vapidPublicKey

      if (!vapidKey) {
        console.warn('[push] VAPID public key not configured')
        return false
      }

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        })
      }

      await $fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: sub.toJSON()
      })

      subscribed.value = true
      return true
    } catch (err) {
      console.error('[push] Failed to subscribe:', err)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!isSupported.value) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await $fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          body: { endpoint: sub.endpoint }
        }).catch(() => null)
        await sub.unsubscribe()
      }
      subscribed.value = false
      return true
    } catch (err) {
      console.error('[push] Failed to unsubscribe:', err)
      return false
    }
  }

  const checkExisting = async () => {
    if (!isSupported.value) {
      subscribed.value = false
      return
    }
    refreshPermission()
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = !!sub
    } catch {
      subscribed.value = false
    } finally {
      initialized.value = true
    }
  }

  return {
    isSupported,
    subscribed,
    permission,
    initialized,
    subscribe,
    unsubscribe,
    checkExisting
  }
}
