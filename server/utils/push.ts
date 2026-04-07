import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { pushSubscriptions, notifications } from '../db/schema'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return

  const config = useRuntimeConfig()
  if (!config.vapidPrivateKey || !config.vapidEmail || !config.public.vapidPublicKey) {
    console.warn('[push] VAPID keys not configured, push notifications disabled')
    return
  }

  webpush.setVapidDetails(
    `mailto:${config.vapidEmail}`,
    config.public.vapidPublicKey,
    config.vapidPrivateKey
  )
  vapidConfigured = true
}

export async function sendPushNotification(userId: string, payload: {
  title: string
  body: string
  url?: string
}) {
  ensureVapid()
  if (!vapidConfigured) return

  const db = useDB()

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        sub.subscription as webpush.PushSubscription,
        JSON.stringify(payload)
      ).catch(async (err) => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
        }
      })
    )
  )
}

export async function createNotification(userId: string, type: string, payload: any) {
  const db = useDB()

  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    type,
    payload
  })
}

export async function notifyUser(userId: string, type: string, push: {
  title: string
  body: string
  url?: string
}, payload?: any) {
  await Promise.all([
    createNotification(userId, type, payload ?? push),
    sendPushNotification(userId, push)
  ])
}
