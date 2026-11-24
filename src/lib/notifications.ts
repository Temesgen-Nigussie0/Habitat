/**
 * iPhone & Web Push Notification Service for Habitat
 *
 * iOS 16.4+ supports Web Push and Notifications for PWAs added to the Home Screen.
 * This service manages permissions, detects standalone iOS mode, and dispatches
 * native notifications through the Service Worker.
 */

import {
  computeNextHabitNotifyIso,
  ensurePushSubscription,
  isBackgroundPushConfigured,
  syncReminderToSupabase,
} from './pushSync'

export interface NotificationStatus {
  isSupported: boolean
  isIos: boolean
  isStandalone: boolean
  permission: NotificationPermission | 'unsupported'
  backgroundPushConfigured: boolean
}

/** Check if the current device is running iOS (iPhone/iPad/iPod) */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIosPlatform = /iPad|iPhone|iPod/.test(ua)
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIosPlatform || isIpadOs
}

/** Check if the app is currently running in standalone PWA mode (added to Home Screen) */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as unknown as { standalone?: boolean }
  const matchMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false
  return Boolean(nav?.standalone || matchMedia)
}

/** Check if Notification API & ServiceWorker are supported */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'serviceWorker' in navigator
}

/** Get the current notification permission state */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Get full status of notifications capability on this device */
export function getNotificationStatus(): NotificationStatus {
  return {
    isSupported: isNotificationSupported(),
    isIos: isIosDevice(),
    isStandalone: isStandaloneMode(),
    permission: getNotificationPermission(),
    backgroundPushConfigured: isBackgroundPushConfigured(),
  }
}

/**
 * Request notification permission from the user.
 * Must be called in response to a direct user action (e.g. tapping a button).
 */
export async function requestAppNotificationPermission(): Promise<{
  granted: boolean
  status: NotificationPermission | 'unsupported' | 'needs_homescreen'
  message?: string
}> {
  if (!isNotificationSupported()) {
    return {
      granted: false,
      status: 'unsupported',
      message: 'Notifications are not supported in this browser.',
    }
  }

  // On iOS, Apple requires the web app to be added to the Home Screen first
  if (isIosDevice() && !isStandaloneMode()) {
    return {
      granted: false,
      status: 'needs_homescreen',
      message:
        'To receive notifications on iPhone, tap Share (box with arrow) at the bottom of Safari, tap "Add to Home Screen", then open Habitat from your Home Screen.',
    }
  }

  try {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      void ensurePushSubscription()
      return { granted: true, status: 'granted' }
    } else if (result === 'denied') {
      return {
        granted: false,
        status: 'denied',
        message: 'Notification permission was denied. You can change this in your device settings.',
      }
    }
    return { granted: false, status: 'default' }
  } catch (err) {
    return {
      granted: false,
      status: 'unsupported',
      message: 'Could not request notification permission.',
    }
  }
}

/**
 * Dispatch a real system notification via Service Worker registration
 * (which handles iOS 16.4+ standalone PWAs and standard desktop/Android PWAs).
 */
export async function sendNativeNotification(
  title: string,
  options?: {
    body?: string
    tag?: string
    icon?: string
    badge?: string
    data?: Record<string, unknown>
  }
): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission !== 'granted') return false

  const iconUrl = options?.icon || '/icons/icon-192.png'
  const badgeUrl = options?.badge || '/icons/icon-192.png'
  const tag = options?.tag || 'habitat-reminder'

  // Haptic feedback if available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150])
    } catch {
      // Ignore vibration errors
    }
  }

  // Preferred method: via Service Worker registration
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body: options?.body,
          icon: iconUrl,
          badge: badgeUrl,
          tag,
          data: options?.data,
        })
        return true
      }
    }
  } catch {
    // Fall back to window.Notification
  }

  // Fallback: window.Notification constructor
  try {
    new Notification(title, {
      body: options?.body,
      icon: iconUrl,
      tag,
    })
    return true
  } catch {
    return false
  }
}

const TASK_REMINDERS_KEY = 'habitat_pending_task_reminders'

export interface PendingTaskReminder {
  id: string
  title: string
  dateStr: string
  timeStr: string
  targetTimestamp: number
}

/**
 * Schedules a native notification reminder for a task on a specific date and time.
 * Requests notification permission if needed, sends an immediate confirmation alert, and sets a timer.
 */
export async function scheduleTaskReminder(
  taskTitle: string,
  dateStr: string,
  timeStr: string
): Promise<void> {
  if (typeof window === 'undefined' || !dateStr || !timeStr) return

  const [hours, minutes] = timeStr.split(':').map(Number)
  const [year, month, day] = dateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day, hours, minutes, 0)
  const targetTimestamp = targetDate.getTime()
  const delay = targetTimestamp - Date.now()

  // Save to persistent localStorage queue immediately
  try {
    const raw = localStorage.getItem(TASK_REMINDERS_KEY)
    const list: PendingTaskReminder[] = raw ? JSON.parse(raw) : []
    const newEntry: PendingTaskReminder = {
      id: `${taskTitle}-${dateStr}-${timeStr}-${Date.now()}`,
      title: taskTitle,
      dateStr,
      timeStr,
      targetTimestamp,
    }
    const updated = list
      .filter((r) => r.targetTimestamp > Date.now() - 86400000)
      .concat(newEntry)
    localStorage.setItem(TASK_REMINDERS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore quota errors
  }

  // Request permission if still default (no noisy confirmation push on save)
  if (isNotificationSupported() && Notification.permission === 'default') {
    await requestAppNotificationPermission()
  }

  // Sync to Supabase so background Web Push fires once (even when app is closed)
  let syncedRemotely = false
  if (targetTimestamp > Date.now() && isBackgroundPushConfigured()) {
    syncedRemotely = await syncReminderToSupabase({
      kind: 'task',
      itemKey: `${taskTitle.trim().toLowerCase()}|${dateStr}|${timeStr}`,
      title: `✅ ${taskTitle}`,
      body: `Due now (${timeStr}) — let's knock it out!`,
      notifyAtIso: targetDate.toISOString(),
    })
  }

  // Only set local in-app timer as fallback when remote push is not active (prevents duplicate alerts)
  if (!syncedRemotely && delay > 0 && delay <= 86400000) {
    window.setTimeout(() => {
      void sendNativeNotification(`✅ ${taskTitle}`, {
        body: `Due now (${timeStr}) — let's knock it out!`,
        tag: `task-reminder-${taskTitle}`,
      })
    }, delay)
  }
}

const HABIT_REMINDERS_KEY = 'habitat_pending_habit_reminders'

/**
 * Schedules a daily habit reminder via Supabase Web Push (with local fallback when offline).
 */
export async function scheduleHabitReminder(
  habitName: string,
  timeStr: string | null
): Promise<void> {
  if (typeof window === 'undefined' || !timeStr) return

  if (isNotificationSupported() && Notification.permission === 'default') {
    await requestAppNotificationPermission()
  }

  // Calculate next occurrence
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
  if (target.getTime() <= now.getTime()) {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0)
  }
  const delay = target.getTime() - now.getTime()

  try {
    const raw = localStorage.getItem(HABIT_REMINDERS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[habitName] = timeStr
    localStorage.setItem(HABIT_REMINDERS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }

  // Sync daily habit reminder to Supabase for background Web Push
  let syncedRemotely = false
  if (isBackgroundPushConfigured()) {
    syncedRemotely = await syncReminderToSupabase({
      kind: 'habit',
      itemKey: habitName.trim().toLowerCase(),
      title: `🔥 ${habitName}`,
      body: `It's ${timeStr} — keep your streak alive!`,
      notifyAtIso: computeNextHabitNotifyIso(timeStr),
      localTime: timeStr,
    })
  }

  // Only set local fallback timer when remote push is not active
  if (!syncedRemotely && delay > 0 && delay <= 86400000) {
    window.setTimeout(() => {
      void sendNativeNotification(`🔥 ${habitName}`, {
        body: `It's ${timeStr} — keep your streak alive!`,
        tag: `habit-reminder-${habitName}`,
      })
    }, delay)
  }
}

/**
 * Checks and schedules any pending local fallback reminders upon app initialization
 * (skipped when Supabase background push is active to avoid duplicate notifications).
 */
export function initPendingTaskReminders(): void {
  if (typeof window === 'undefined') return
  if (isBackgroundPushConfigured()) return
  try {
    const raw = localStorage.getItem(TASK_REMINDERS_KEY)
    if (!raw) return
    const list: PendingTaskReminder[] = JSON.parse(raw)
    const now = Date.now()
    const active = list.filter((r) => r.targetTimestamp > now)

    for (const item of active) {
      const delay = item.targetTimestamp - now
      if (delay > 0 && delay <= 86400000) {
        window.setTimeout(() => {
          void sendNativeNotification(`✅ ${item.title}`, {
            body: `Due now (${item.timeStr}) — let's knock it out!`,
            tag: `task-reminder-${item.id}`,
          })
        }, delay)
      }
    }
    localStorage.setItem(TASK_REMINDERS_KEY, JSON.stringify(active))
  } catch {
    // ignore
  }
}
