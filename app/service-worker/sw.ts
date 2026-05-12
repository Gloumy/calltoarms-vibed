/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

type PushPayload = {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  requireInteraction?: boolean
  actions?: { action: string, title: string, icon?: string }[]
  data?: Record<string, unknown>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Pas de skipWaiting() automatique : le nouveau SW reste en `waiting`
// jusqu'à ce que la bannière côté client envoie SKIP_WAITING (déclenché
// par $pwa.updateServiceWorker(true) → workbox-window).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Call to Arms', body: event.data.text() }
  }

  const { title, body, icon, badge, url, tag, requireInteraction, actions, data } = payload

  // `actions` is only typed on the SW-side NotificationOptions; cast to bypass DOM lib mismatch.
  const options = {
    body,
    icon: icon ?? '/logo.png',
    badge: badge ?? '/favicon-32x32.png',
    tag,
    requireInteraction: requireInteraction ?? false,
    actions: actions ?? [],
    data: { ...(data ?? {}), url }
  } as NotificationOptions

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action
  const data = (notification.data ?? {}) as { url?: string, type?: string, sessionId?: string }

  notification.close()

  // Decline → just dismiss (server-side state for invites n'existe pas encore)
  if (action === 'decline') return

  event.waitUntil((async () => {
    let targetUrl: string = data.url ?? '/'

    if (action === 'join' && data.type === 'session_invite' && data.sessionId) {
      targetUrl = `/sessions/${data.sessionId}`
      // Fire-and-forget: try to join immediately. Cookies are sent for same-origin.
      try {
        await fetch(`/api/sessions/${data.sessionId}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      } catch {
        // Silent — the session page will let the user retry
      }
    }

    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client) {
          try {
            await (client as WindowClient).navigate(targetUrl)
          } catch { /* cross-origin nav not allowed */ }
        }
        return
      }
    }
    await self.clients.openWindow(targetUrl)
  })())
})
