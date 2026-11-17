/**
 * iPhone & Web Push Notification Service for Habitat
 *
 * iOS 16.4+ supports Web Push and Notifications for PWAs added to the Home Screen.
 * This service manages permissions, detects standalone iOS mode, and dispatches
 * native notifications through the Service Worker.
 */

export interface NotificationStatus {
  isSupported: boolean
  isIos: boolean
  isStandalone: boolean
  permission: NotificationPermission | 'unsupported'
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

  // Prompt for permission if not granted
  if (isNotificationSupported() && Notification.permission !== 'granted') {
    await requestAppNotificationPermission()
  }

  // Send immediate feedback that reminder is active
  await sendNativeNotification(`⏰ Reminder Set: ${taskTitle}`, {
    body: `Habitat will alert you at ${timeStr}.`,
    tag: `task-confirm-${taskTitle}`,
  })

  if (delay > 0 && delay <= 86400000) {
    window.setTimeout(() => {
      void sendNativeNotification(`⏰ Task Reminder: ${taskTitle}`, {
        body: `Due now (${timeStr}). Tap to complete in Habitat.`,
        tag: `task-reminder-${taskTitle}`,
      })
    }, delay)
  }
}

const HABIT_REMINDERS_KEY = 'habitat_pending_habit_reminders'

/**
 * Schedules a daily habit reminder. Sends an immediate confirmation and sets the timer.
 */
export async function scheduleHabitReminder(
  habitName: string,
  timeStr: string | null
): Promise<void> {
  if (typeof window === 'undefined' || !timeStr) return

  if (isNotificationSupported() && Notification.permission !== 'granted') {
    await requestAppNotificationPermission()
  }

  // Send immediate confirmation
  await sendNativeNotification(`🔔 Habit Reminder Active: ${habitName}`, {
    body: `Daily prompt scheduled for ${timeStr}.`,
    tag: `habit-confirm-${habitName}`,
  })

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

  if (delay > 0 && delay <= 86400000) {
    window.setTimeout(() => {
      void sendNativeNotification(`🔥 Its Time to: ${habitName}`, {
        body: `Don't say for later. DO it NOW!!`,
        tag: `habit-reminder-${habitName}`,
      })
    }, delay)
  }
}

/**
 * Checks and schedules any pending reminders from localStorage upon app initialization.
 */
export function initPendingTaskReminders(): void {
  if (typeof window === 'undefined') return
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
          void sendNativeNotification(`⏰ Task Reminder: ${item.title}`, {
            body: `Scheduled for ${item.timeStr}. Tap to open Habitat.`,
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
