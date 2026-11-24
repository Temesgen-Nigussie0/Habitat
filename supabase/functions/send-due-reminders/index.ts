import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// ─── Base64URL & Byte Helpers ─────────────────────────────────────────────────

function b64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    out.set(arr, offset)
    offset += arr.length
  }
  return out
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  lengthBytes: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm as BufferSource,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: info as BufferSource,
    },
    key,
    lengthBytes * 8
  )
  return new Uint8Array(bits)
}

// ─── VAPID JWT (RFC 8292) ─────────────────────────────────────────────────────

async function createVapidJwt(
  endpoint: string,
  subject: string,
  vapidPublicB64: string,
  vapidPrivateB64: string
): Promise<string> {
  const audience = new URL(endpoint).origin
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const headerB64 = b64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  )
  const payloadB64 = b64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject }))
  )
  const unsignedToken = `${headerB64}.${payloadB64}`

  const pubBytes = b64UrlDecode(vapidPublicB64)
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('Invalid VAPID_PUBLIC_KEY format (expected 65-byte uncompressed P-256 key)')
  }
  const x = b64UrlEncode(pubBytes.slice(1, 33))
  const y = b64UrlEncode(pubBytes.slice(33, 65))

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: vapidPrivateB64 },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsignedToken)
  )

  return `${unsignedToken}.${b64UrlEncode(new Uint8Array(sig))}`
}

// ─── Web Push Encryption (RFC 8291 aes128gcm) ─────────────────────────────────

async function sendWebPush(
  sub: SubscriptionRow,
  payloadObj: Record<string, unknown>,
  vapidPublic: string,
  vapidPrivate: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number; errorText?: string }> {
  const uaPublicBytes = b64UrlDecode(sub.p256dh)
  const authSecretBytes = b64UrlDecode(sub.auth)

  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const asPublicBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', asKeyPair.publicKey)
  )

  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicBytes as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaPublicKey },
      asKeyPair.privateKey,
      256
    )
  )

  const enc = new TextEncoder()
  const keyInfo = concatBytes(
    enc.encode('WebPush: info\0'),
    uaPublicBytes,
    asPublicBytes
  )
  const ikm = await hkdf(authSecretBytes, ecdhSecret, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const plaintext = concatBytes(
    enc.encode(JSON.stringify(payloadObj)),
    new Uint8Array([0x02])
  )
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource },
      aesKey,
      plaintext as BufferSource
    )
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const idlen = new Uint8Array([asPublicBytes.length])
  const body = concatBytes(salt, rs, idlen, asPublicBytes, ciphertext)

  const jwt = await createVapidJwt(
    sub.endpoint,
    vapidSubject,
    vapidPublic,
    vapidPrivate
  )

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
    },
    body: body as BodyInit,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    return { ok: false, status: res.status, errorText }
  }

  return { ok: true, status: res.status }
}

// ─── Next Daily Occurrence Helper ─────────────────────────────────────────────

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

    const utcGuess = new Date(Date.UTC(y, m - 1, d, targetHour, targetMinute, 0))
    const localAtGuess = new Date(utcGuess.toLocaleString('en-US', { timeZone }))
    const offsetMs = utcGuess.getTime() - localAtGuess.getTime()
    return new Date(utcGuess.getTime() + offsetMs).toISOString()
  } catch {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// ─── Edge Function Entrypoint ─────────────────────────────────────────────────

Deno.serve(async () => {
  try {
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim()
    const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
    const vapidPublic = (Deno.env.get('VAPID_PUBLIC_KEY') ?? '').trim().replace(/^["']|["']$/g, '')
    const vapidPrivate = (Deno.env.get('VAPID_PRIVATE_KEY') ?? '').trim().replace(/^["']|["']$/g, '')
    let vapidSubject = (Deno.env.get('VAPID_SUBJECT') ?? '').trim().replace(/^["']|["']$/g, '')
    if (!vapidSubject) {
      vapidSubject = 'mailto:support@habitat.app'
    } else if (!vapidSubject.startsWith('mailto:') && !vapidSubject.startsWith('https://')) {
      vapidSubject = `mailto:${vapidSubject}`
    }

    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return new Response(
        JSON.stringify({ error: 'Missing required Supabase or VAPID secrets' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

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
    const errors: string[] = []

    for (const row of (reminders ?? []) as ReminderRow[]) {
      const sub = row.push_subscriptions
      if (!sub) continue

      try {
        const pushRes = await sendWebPush(
          sub,
          {
            title: row.title,
            body: row.body,
            tag: `${row.kind}-${row.item_key}`,
            url: row.kind === 'task' ? '/tasks' : '/',
          },
          vapidPublic,
          vapidPrivate,
          vapidSubject
        )

        if (pushRes.ok) {
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
        } else {
          failedCount++
          errors.push(`HTTP ${pushRes.status}: ${pushRes.errorText || 'Push rejected'}`)
          if (pushRes.status === 404 || pushRes.status === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('device_id', sub.device_id)
          }
        }
      } catch (err: unknown) {
        failedCount++
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    return new Response(
      JSON.stringify({
        checked: reminders?.length ?? 0,
        sentCount,
        failedCount,
        errors,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (fatal: unknown) {
    return new Response(
      JSON.stringify({
        error: fatal instanceof Error ? fatal.message : String(fatal),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
