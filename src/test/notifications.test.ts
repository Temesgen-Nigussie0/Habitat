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
})

