import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

interface SwGlobalScope {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
  skipWaiting: () => Promise<void>
  registration: ServiceWorkerRegistration
  clients: {
    matchAll: (options?: { type?: string; includeUncontrolled?: boolean }) => Promise<Array<{
      url: string
      focus: () => Promise<unknown>
    }>>
    openWindow: (url: string) => Promise<unknown>
  }
  addEventListener: (type: string, listener: (event: any) => void) => void
}

const sw = self as unknown as SwGlobalScope

cleanupOutdatedCaches()
precacheAndRoute((self as unknown as SwGlobalScope).__WB_MANIFEST)

// Cache Google Fonts stylesheets & font files
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
)

// Allow SwUpdateBanner to trigger immediate activation
sw.addEventListener('message', (event: { data?: { type?: string } }) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void sw.skipWaiting()
  }
})

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  icon?: string
  badge?: string
  url?: string
}

// Wake up and show lock-screen / system notification on incoming Web Push
sw.addEventListener('push', (event: { data?: { json: () => PushPayload; text: () => string }; waitUntil: (p: Promise<unknown>) => void }) => {
  let payload: PushPayload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = payload.title || 'Habitat Reminder'
  const options: NotificationOptions = {
    body: payload.body || 'Time to check in on your habits and tasks.',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'habitat-push',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(sw.registration.showNotification(title, options))
})

// Focus or open Habitat when user taps the notification
sw.addEventListener('notificationclick', (event: { notification: Notification; waitUntil: (p: Promise<unknown>) => void }) => {
  event.notification.close()
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url || '/'

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus()
          }
        }
        return sw.clients.openWindow(targetUrl)
      })
  )
})
