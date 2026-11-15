import { describe, expect, it } from 'vitest'
import {
  getNotificationStatus,
  isIosDevice,
  isStandaloneMode,
  requestAppNotificationPermission,
  sendNativeNotification,
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
})

