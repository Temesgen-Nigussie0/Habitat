import { describe, expect, it, vi } from 'vitest'
import { addDays, startOfWeek } from 'date-fns'
import { db, upgradeProfileV3, upgradeTaskV2 } from '../db/db'
import type { Task, UserProfile } from '../db/types'
import {
  dismissBackupNudgeFor7Days,
  restoreBackupData,
  shouldShowBackupNudge,
  undoLastImport,
  validateBackupData,
} from '../lib/backup'
import { formatLocalDate } from '../lib/streak'

describe('Phase 4: Polish, Safety & Install Quality', () => {
  it('validates imported backup files and rejects non-Habitat payloads', () => {
    expect(() => validateBackupData(null)).toThrow(
      'This file is not a valid Habitat backup.'
    )
    expect(() => validateBackupData({ hello: 'world' })).toThrow(
      'This file is not a valid Habitat backup.'
    )
    expect(() =>
      validateBackupData({
        version: 1,
        exportedAt: '2026-11-12T00:00:00Z',
        habits: 'not-an-array',
        habitEntries: [],
        tasks: [],
        userProfile: [],
      })
    ).toThrow('This file is not a valid Habitat backup.')

    const valid = validateBackupData({
      version: 1,
      exportedAt: '2026-11-12T00:00:00Z',
      habits: [],
      habitEntries: [],
      tasks: [],
      userProfile: [],
    })
    expect(valid.version).toBe(1)
    expect(valid.bossChallenges).toEqual([])
    expect(valid.streakFreezes).toEqual([])
  })

  it('saves lastBeforeRestore before import and restores it on undoLastImport', async () => {
    const preImportHabits = [{ id: 1, name: 'Original Habit' }]
    const incomingPayload = {
      version: 1,
      exportedAt: '2026-11-12T10:00:00Z',
      habits: [{ id: 99, name: 'Imported Habit' }],
      habitEntries: [],
      tasks: [],
      userProfile: [],
      bossChallenges: [],
      streakFreezes: [],
    }

    vi.spyOn(db.habits, 'toArray').mockResolvedValue(preImportHabits as never[])
    vi.spyOn(db.habitEntries, 'toArray').mockResolvedValue([])
    vi.spyOn(db.tasks, 'toArray').mockResolvedValue([])
    vi.spyOn(db.userProfile, 'toArray').mockResolvedValue([])
    vi.spyOn(db.bossChallenges, 'toArray').mockResolvedValue([])
    vi.spyOn(db.streakFreezes, 'toArray').mockResolvedValue([])

    let savedSnapshotValue = ''
    const metaPutSpy = vi
      .spyOn(db.meta, 'put')
      .mockImplementation((async (entry: { key: string; value: string }) => {
        savedSnapshotValue = entry.value
        return entry.key
      }) as never)
    const metaGetSpy = vi
      .spyOn(db.meta, 'get')
      .mockImplementation((async () => ({
        key: 'lastBeforeRestore',
        value: savedSnapshotValue,
        updatedAt: Date.now(),
      })) as never)
    const metaDeleteSpy = vi.spyOn(db.meta, 'delete').mockResolvedValue()

    vi.spyOn(db, 'transaction').mockImplementation((async (...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<unknown>
      return fn()
    }) as never)
    vi.spyOn(db.habits, 'clear').mockResolvedValue()
    vi.spyOn(db.habitEntries, 'clear').mockResolvedValue()
    vi.spyOn(db.tasks, 'clear').mockResolvedValue()
    vi.spyOn(db.userProfile, 'clear').mockResolvedValue()
    vi.spyOn(db.bossChallenges, 'clear').mockResolvedValue()
    vi.spyOn(db.streakFreezes, 'clear').mockResolvedValue()
    const habitsBulkPut = vi
      .spyOn(db.habits, 'bulkPut')
      .mockResolvedValue(1 as never)

    await restoreBackupData(incomingPayload)
    expect(metaPutSpy).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'lastBeforeRestore' })
    )
    expect(habitsBulkPut).toHaveBeenCalledWith(incomingPayload.habits)

    const undone = await undoLastImport()
    expect(undone).toBe(true)
    expect(metaGetSpy).toHaveBeenCalledWith('lastBeforeRestore')
    expect(habitsBulkPut).toHaveBeenLastCalledWith(preImportHabits)
    expect(metaDeleteSpy).toHaveBeenCalledWith('lastBeforeRestore')

    vi.restoreAllMocks()
  })

  it('preserves v1 task & profile data across v1 -> v3/v4 Dexie upgrades', () => {
    expect(db.verno).toBe(4)

    const v1Task: Partial<Task> = {
      id: 42,
      title: 'Old V1 Task',
      priority: 'Urgent',
      isCompleted: false,
      dueDate: '2026-10-01',
    }
    upgradeTaskV2(v1Task)
    expect(v1Task.id).toBe(42)
    expect(v1Task.title).toBe('Old V1 Task')
    expect(v1Task.kanbanStatus).toBe('TODO')
    expect(v1Task.scope).toBe('Short-Term')

    const v1Profile: Partial<UserProfile> = {
      id: 1,
      userName: 'Abi',
      isOnboardingCompleted: true,
      streakFreezesAvailable: 3,
    }
    upgradeProfileV3(v1Profile)
    expect(v1Profile.userName).toBe('Abi')
    expect(v1Profile.isOnboardingCompleted).toBe(true)
    expect(v1Profile.streakFreezesAvailable).toBe(3)
    expect(v1Profile.smartSchedulerEnabled).toBe(true)
    expect(v1Profile.lastExportedAt).toBeNull()
  })

  it('handles midnight, local timezone, and Sunday week-strip date edges', () => {
    // Midnight edge: 23:59:59 vs 00:00:01 local
    const beforeMidnight = new Date(2026, 10, 12, 23, 59, 59)
    const afterMidnight = new Date(2026, 10, 13, 0, 0, 1)
    expect(formatLocalDate(beforeMidnight)).toBe('2026-11-12')
    expect(formatLocalDate(afterMidnight)).toBe('2026-11-13')

    // Week strip on Sunday (2026-11-15 is a Sunday) must still start on Monday 2026-11-09
    const sunday = new Date(2026, 10, 15, 12, 0, 0)
    expect(sunday.getDay()).toBe(0)
    const weekStart = startOfWeek(sunday, { weekStartsOn: 1 })
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      formatLocalDate(addDays(weekStart, i))
    )
    expect(weekDates[0]).toBe('2026-11-09')
    expect(weekDates[6]).toBe('2026-11-15')
  })

  it('triggers backup nudge only after 5+ entries and 14+ days without export or dismissal', () => {
    const now = 1_700_000_000_000
    localStorage.clear()

    expect(shouldShowBackupNudge(null, 4, now)).toBe(false)
    expect(shouldShowBackupNudge(null, 5, now)).toBe(true)
    expect(
      shouldShowBackupNudge({ lastExportedAt: now - 5 * 86400_000 } as UserProfile, 10, now)
    ).toBe(false)
    expect(
      shouldShowBackupNudge({ lastExportedAt: now - 15 * 86400_000 } as UserProfile, 10, now)
    ).toBe(true)

    dismissBackupNudgeFor7Days(now)
    expect(shouldShowBackupNudge(null, 10, now + 3 * 86400_000)).toBe(false)
    expect(shouldShowBackupNudge(null, 10, now + 8 * 86400_000)).toBe(true)
  })
})
