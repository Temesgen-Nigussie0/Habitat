// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Supabase Web Push Subscription & Reminder Sync Client
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_ID_KEY = 'habitat_device_id'

function getConfig() {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
  const supabaseAnonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''
  const vapidPublicKey =
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || ''
  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    supabaseAnonKey,
    vapidPublicKey,
  }
}

export function isBackgroundPushConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey, vapidPublicKey } = getConfig()
  return Boolean(supabaseUrl && supabaseAnonKey && vapidPublicKey)
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr-device'
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
  } catch {
    return `dev-${Date.now()}`
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Computes the next UTC ISO timestamp for a daily habit time ("HH:mm").
 */
export function computeNextHabitNotifyIso(
  timeStr: string,
  now: Date = new Date()
): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  let target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours || 0,
    minutes || 0,
    0,
    0
  )
  if (target.getTime() <= now.getTime()) {
    target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      hours || 0,
      minutes || 0,
      0,
      0
    )
  }
  return target.toISOString()
}

/**
 * Subscribes the current browser/iPhone PWA to Web Push and syncs the
 * push subscription to Supabase `push_subscriptions`.
 */
export async function ensurePushSubscription(): Promise<{
  subscribed: boolean
  reason?: string
}> {
  if (typeof window === 'undefined') return { subscribed: false, reason: 'ssr' }
  if (!isBackgroundPushConfigured()) {
    return { subscribed: false, reason: 'not_configured' }
  }
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return { subscribed: false, reason: 'unsupported' }
  }
  if (Notification.permission !== 'granted') {
    return { subscribed: false, reason: 'permission_not_granted' }
  }

  try {
    const { supabaseUrl, supabaseAnonKey, vapidPublicKey } = getConfig()
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
    }

    const json = subscription.toJSON()
    const p256dh =
      json.keys?.p256dh || arrayBufferToBase64(subscription.getKey('p256dh'))
    const auth =
      json.keys?.auth || arrayBufferToBase64(subscription.getKey('auth'))

    if (!subscription.endpoint || !p256dh || !auth) {
      return { subscribed: false, reason: 'incomplete_keys' }
    }

    const deviceId = getDeviceId()
    const res = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=device_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          device_id: deviceId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          timezone: getLocalTimezone(),
          updated_at: new Date().toISOString(),
        }),
      }
    )

    if (!res.ok) {
      return { subscribed: false, reason: `supabase_error_${res.status}` }
    }

    return { subscribed: true }
  } catch {
    return { subscribed: false, reason: 'subscribe_failed' }
  }
}

export interface SyncReminderInput {
  kind: 'task' | 'habit'
  itemKey: string
  title: string
  body: string
  notifyAtIso: string
  localTime?: string | null
}

/**
 * Syncs a scheduled task or habit reminder to Supabase so the Edge Function
 * pushes it even when Habitat is closed.
 */
export async function syncReminderToSupabase(
  input: SyncReminderInput
): Promise<boolean> {
  if (!isBackgroundPushConfigured()) return false

  const subRes = await ensurePushSubscription()
  if (!subRes.subscribed) return false

  try {
    const { supabaseUrl, supabaseAnonKey } = getConfig()
    const deviceId = getDeviceId()
    const res = await fetch(
      `${supabaseUrl}/rest/v1/scheduled_reminders?on_conflict=device_id,kind,item_key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          device_id: deviceId,
          kind: input.kind,
          item_key: input.itemKey,
          title: input.title,
          body: input.body,
          notify_at: input.notifyAtIso,
          local_time: input.localTime ?? null,
          timezone: getLocalTimezone(),
          sent: false,
          sent_at: null,
        }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

/**
 * Cancels a previously synced reminder in Supabase (e.g., if deleted or completed).
 */
export async function cancelReminderInSupabase(
  kind: 'task' | 'habit',
  itemKey: string
): Promise<void> {
  if (!isBackgroundPushConfigured()) return
  try {
    const { supabaseUrl, supabaseAnonKey } = getConfig()
    const deviceId = getDeviceId()
    const params = new URLSearchParams({
      device_id: `eq.${deviceId}`,
      kind: `eq.${kind}`,
      item_key: `eq.${itemKey}`,
    })
    await fetch(`${supabaseUrl}/rest/v1/scheduled_reminders?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })
  } catch {
    // ignore offline errors
  }
}
