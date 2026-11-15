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
