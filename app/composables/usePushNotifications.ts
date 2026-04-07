export const usePushNotifications = () => {
  const subscribed = useState('push-subscribed', () => false)

  const isSupported = computed(() =>
    import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window
  )

  const subscribe = async () => {
    if (!isSupported.value) return false

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const vapidKey = useRuntimeConfig().public.vapidPublicKey

      if (!vapidKey) {
        console.warn('[push] VAPID public key not configured')
        return false
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      })

      await $fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: subscription.toJSON()
      })

      subscribed.value = true
      return true
    } catch (err) {
      console.error('[push] Failed to subscribe:', err)
      return false
    }
  }

  const checkExisting = async () => {
    if (!isSupported.value) return

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = !!sub
    } catch {
      subscribed.value = false
    }
  }

  return { isSupported, subscribed, subscribe, checkExisting }
}
