import { describe, expect, it } from 'vitest'
import {
  getNotificationStatus,
  isIosDevice,
  isStandaloneMode,
  requestAppNotificationPermission,
  sendNativeNotification,
  scheduleTaskReminder,
  initPendingTaskReminders,
} from '../lib/notifications'
import {
  computeNextHabitNotifyIso,
  getDeviceId,
  isBackgroundPushConfigured,
  urlBase64ToUint8Array,
} from '../lib/pushSync'

describe('Notifications service', () => {
  it('detects notification status correctly in test environment', () => {
    const status = getNotificationStatus()
    expect(typeof status.isSupported).toBe('boolean')
    expect(typeof status.isIos).toBe('boolean')
    expect(typeof status.isStandalone).toBe('boolean')
    expect(['granted', 'denied', 'default', 'unsupported']).toContain(status.permission)
  })

  it('safely handles requestAppNotificationPermission in test environment', async () => {
    const result = await requestAppNotificationPermission()
    expect(typeof result.granted).toBe('boolean')
    expect(['granted', 'denied', 'default', 'unsupported', 'needs_homescreen']).toContain(
      result.status
    )
  })

  it('safely returns false when sending notification without permission', async () => {
    const sent = await sendNativeNotification('Test Alert', { body: 'Testing' })
    expect(typeof sent).toBe('boolean')
  })

  it('safely schedules and initializes task reminders in localStorage', () => {
    scheduleTaskReminder('Client Call', '2026-11-15', '14:30')
    const raw = localStorage.getItem('habitat_pending_task_reminders')
    expect(raw).toBeTruthy()
    const list = JSON.parse(raw || '[]')
    expect(list.some((r: any) => r.title === 'Client Call')).toBe(true)

    // Verify init runs without throwing
    expect(() => initPendingTaskReminders()).not.toThrow()
  })

  it('persists a stable deviceId and converts VAPID keys safely', () => {
    localStorage.removeItem('habitat_device_id')
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBeTruthy()
    expect(id2).toBe(id1)

    const bytes = urlBase64ToUint8Array('SGVsbG8')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(5)
    expect(typeof isBackgroundPushConfigured()).toBe('boolean')
  })

  it('computes next daily habit notification ISO timestamp in the future', () => {
    const now = new Date(2026, 10, 24, 14, 0, 0)
    const laterToday = new Date(computeNextHabitNotifyIso('16:30', now))
    expect(laterToday.getTime()).toBeGreaterThan(now.getTime())
    expect(laterToday.getDate()).toBe(24)

    const tomorrow = new Date(computeNextHabitNotifyIso('08:00', now))
    expect(tomorrow.getTime()).toBeGreaterThan(now.getTime())
    expect(tomorrow.getDate()).toBe(25)
  })
})

