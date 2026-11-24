import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface SubscriptionRow {
  device_id: string
  endpoint: string
  p256dh: string
  auth: string
  timezone: string
}

interface ReminderRow {
  id: string
  device_id: string
  kind: 'task' | 'habit'
  item_key: string
  title: string
  body: string
  notify_at: string
  local_time: string | null
  timezone: string
  push_subscriptions: SubscriptionRow | null
}

/**
 * Computes the next UTC ISO timestamp for a daily habit reminder in the user's timezone.
 * Advances by 1 calendar day from `now` at `HH:mm` local time.
 */
function computeNextDailyUtcIso(localTime: string, timeZone: string): string {
  const [targetHour, targetMinute] = localTime.split(':').map(Number)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(tomorrow)

    const y = Number(parts.find((p) => p.type === 'year')?.value)
    const m = Number(parts.find((p) => p.type === 'month')?.value)
    const d = Number(parts.find((p) => p.type === 'day')?.value)

    // Estimate UTC offset at that date by comparing formatted local vs UTC
    const utcGuess = new Date(Date.UTC(y, m - 1, d, targetHour, targetMinute, 0))
    const localAtGuess = new Date(
      utcGuess.toLocaleString('en-US', { timeZone })
    )
    const offsetMs = utcGuess.getTime() - localAtGuess.getTime()
    return new Date(utcGuess.getTime() + offsetMs).toISOString()
  } catch {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@habitat.app'

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return new Response(
      JSON.stringify({ error: 'Missing required Supabase or VAPID secrets' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const supabase = createClient(supabaseUrl, serviceKey)

  const nowIso = new Date().toISOString()
  const { data: reminders, error } = await supabase
    .from('scheduled_reminders')
    .select('*, push_subscriptions(*)')
    .eq('sent', false)
    .lte('notify_at', nowIso)
    .limit(100)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sentCount = 0
  let failedCount = 0

  for (const row of (reminders ?? []) as ReminderRow[]) {
    const sub = row.push_subscriptions
    if (!sub) continue

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: row.title,
          body: row.body,
          tag: `${row.kind}-${row.item_key}`,
          url: row.kind === 'task' ? '/tasks' : '/',
        })
      )
      sentCount++

      if (row.kind === 'habit' && row.local_time) {
        const nextNotifyAt = computeNextDailyUtcIso(
          row.local_time,
          row.timezone || sub.timezone || 'UTC'
        )
        await supabase
          .from('scheduled_reminders')
          .update({
            notify_at: nextNotifyAt,
            sent: false,
            sent_at: nowIso,
          })
          .eq('id', row.id)
      } else {
        await supabase
          .from('scheduled_reminders')
          .update({ sent: true, sent_at: nowIso })
          .eq('id', row.id)
      }
    } catch (err: unknown) {
      failedCount++
      const statusCode = (err as { statusCode?: number })?.statusCode
      // 404 or 410 means the browser/iPhone push subscription expired -> clean it up
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('device_id', sub.device_id)
      }
    }
  }

  return new Response(
    JSON.stringify({ checked: reminders?.length ?? 0, sentCount, failedCount }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
