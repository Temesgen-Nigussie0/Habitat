import { describe, expect, it, vi } from 'vitest'
import type { Habit, HabitEntry, Task, UserProfile } from '../db/types'
import {
  getHabitConsistencyRate7Days,
  getHeatmapData,
  getMilestoneBadges,
  getPillarScores,
  getSmartHabitSuggestions,
} from '../lib/analytics'
import { calculateStreak } from '../lib/streak'
import { db, upgradeProfileV3 } from '../db/db'
import { activateStreakFreeze, addQuickHabitIfNew } from '../db/actions'
import {
  createBackupPayload,
  parseBackupPreview,
  restoreBackupData,
} from '../lib/backup'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    name: 'Test Habit',
    category: 'Health',
    iconName: 'water',
    colorHex: '#FF6A00',
    targetCount: 1,
    unit: 'times',
    timeOfDay: 'Morning',
    frequency: 'DAILY',
    customDays: '',
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    createdAt: 1000,
    isArchived: false,
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Sample Task',
    notes: '',
    category: 'Software Dev',
    priority: 'Medium',
    scope: 'Short-Term',
    dueDate: '2026-11-12',
    endDate: null,
    dailyTimeline: null,
    estimatedHours: 1,
    clientOrCourse: 'Personal Workspace',
    tags: '',
    kanbanStatus: 'TODO',
    isCompleted: false,
    completedAt: null,
    createdAt: 1000,
    ...overrides,
  }
}

describe('Phase 3: Analytics & Profile', () => {
  it('computes frequency-aware 7-day habit rate and returns 0 when nothing scheduled', () => {
    expect(getHabitConsistencyRate7Days([], [], '2026-11-12')).toBe(0)

    // 2026-11-12 is Thursday. Weekdays in [Nov 6..Nov 12] = Fri, Mon, Tue, Wed, Thu (5 days)
    const weekdayHabit = makeHabit({ id: 1, frequency: 'WEEKDAYS' })
    const entries: HabitEntry[] = [
      { id: 1, habitId: 1, date: '2026-11-12', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
      { id: 2, habitId: 1, date: '2026-11-11', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
      { id: 3, habitId: 1, date: '2026-11-10', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
      { id: 4, habitId: 1, date: '2026-11-09', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
      { id: 5, habitId: 1, date: '2026-11-06', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
    ]
    expect(getHabitConsistencyRate7Days([weekdayHabit], entries, '2026-11-12')).toBe(100)
  })

  it('counts heatmap contributions by task completedAt local date (not dueDate) and matches cell sum', () => {
    const completedAtLocal = new Date(2026, 10, 12, 14, 30, 0).getTime() // 2026-11-12 local
    const tasks = [
      makeTask({
        id: 1,
        dueDate: '2026-11-01', // different dueDate!
        isCompleted: true,
        completedAt: completedAtLocal,
      }),
    ]
    const entries: HabitEntry[] = [
      { id: 1, habitId: 1, date: '2026-11-12', currentCount: 1, targetCount: 1, isCompleted: true, completedAt: 1000, notes: null },
    ]

    const result = getHeatmapData(entries, tasks, 18, '2026-11-12')
    const flatCells = result.weeks.flat()
    const nov12 = flatCells.find((c) => c.dateString === '2026-11-12')
    const nov01 = flatCells.find((c) => c.dateString === '2026-11-01')

    expect(nov12?.count).toBe(2)
    expect(nov01?.count).toBe(0)
    expect(result.totalContributions).toBe(flatCells.reduce((s, c) => s + c.count, 0))
    expect(result.totalContributions).toBe(2)
  })

  it('returns 0 for pillar scores with no data (no fake defaults) and merges Academics + University', () => {
    const empty = getPillarScores([], [], [], '2026-11-12')
    expect(empty).toEqual({
      dev: 0,
      video: 0,
      academics: 0,
      vitality: 0,
      balance: 0,
      status: 'CALIBRATING',
    })

    const tasks = [
      makeTask({ id: 1, category: 'Academics', isCompleted: true }),
      makeTask({ id: 2, category: 'University', isCompleted: false }),
      makeTask({ id: 3, category: 'Software Dev', isCompleted: true }),
    ]
    const merged = getPillarScores([], [], tasks, '2026-11-12')
    expect(merged.academics).toBe(50)
    expect(merged.dev).toBe(100)
    expect(merged.video).toBe(0)
    expect(merged.vitality).toBe(0)
    expect(merged.balance).toBe(Math.round((100 + 0 + 50 + 0) / 4))
  })

  it('evaluates milestone badge unlock rules using bestStreak for 7/21/66 and total completions for 1/100', () => {
    const habits = [makeHabit({ id: 1, bestStreak: 22, currentStreak: 5 })]
    const entries: HabitEntry[] = Array.from({ length: 10 }, (_, idx) => ({
      id: idx + 1,
      habitId: 1,
      date: `2026-11-0${(idx % 9) + 1}`,
      currentCount: 1,
      targetCount: 1,
      isCompleted: true,
      completedAt: 1000,
      notes: null,
    }))

    const badges = getMilestoneBadges(habits, entries, null)
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]))

    expect(byId.ignition.isUnlocked).toBe(true)
    expect(byId['7_streak'].isUnlocked).toBe(true)
    expect(byId['21_habit'].isUnlocked).toBe(true)
    expect(byId.iron_will.isUnlocked).toBe(false)
    expect(byId.century_club.isUnlocked).toBe(false)
    expect(byId.boss_conqueror.isUnlocked).toBe(false)
  })

  it('protects streak with a freeze date and decrements shield count on activateStreakFreeze', async () => {
    // Streak protection via freeze date
    const streak = calculateStreak(
      ['2026-11-10', '2026-11-12'],
      'DAILY',
      '',
      ['2026-11-11'],
      '2026-11-12'
    )
    expect(streak.currentStreak).toBe(3)

    // Shield count decrement via activateStreakFreeze
    const fakeProfile: UserProfile = {
      id: 1,
      userName: 'Test',
      headline: '',
      bio: '',
      bannerUri: null,
      avatarUri: null,
      focusArea: '',
      currentConsistency: '',
      frictionHurdle: '',
      targetHabitLoad: '',
      primeZone: '',
      starterHabits: '',
      motivationStyle: '',
      timeCommitment: '',
      briefingTime: '08:00 AM',
      pledgeAccepted: true,
      isOnboardingCompleted: true,
      occupations: '',
      workspaces: '',
      streakFreezesAvailable: 2,
      streakFreezesUsed: 0,
      isComebackProtocolActive: false,
      lastFreezeDate: null,
      joinedAt: 1000,
    }

    const getSpy = vi.spyOn(db.userProfile, 'get').mockResolvedValue(fakeProfile)
    const putSpy = vi.spyOn(db.userProfile, 'put').mockResolvedValue(1 as never)
    const freezeCountSpy = vi.fn().mockResolvedValue(0)
    const whereSpy = vi.spyOn(db.streakFreezes, 'where').mockReturnValue({
      equals: () => ({ count: freezeCountSpy }),
    } as never)
    const freezeAddSpy = vi.spyOn(db.streakFreezes, 'add').mockResolvedValue(1 as never)
    const habitsToArraySpy = vi.spyOn(db.habits, 'toArray').mockResolvedValue([])
    const txSpy = vi.spyOn(db, 'transaction').mockImplementation((async (...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<unknown>
      return fn()
    }) as never)

    const activated = await activateStreakFreeze()
    expect(activated).toBe(true)
    expect(freezeAddSpy).toHaveBeenCalledTimes(1)
    expect(putSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        streakFreezesAvailable: 1,
        streakFreezesUsed: 1,
      })
    )

    getSpy.mockRestore()
    putSpy.mockRestore()
    whereSpy.mockRestore()
    freezeAddSpy.mockRestore()
    habitsToArraySpy.mockRestore()
    txSpy.mockRestore()
  })

  it('prevents duplicate 1-tap quick habit additions', async () => {
    const existing = [makeHabit({ id: 1, name: 'Cold Shower' })]
    const toArraySpy = vi.spyOn(db.habits, 'toArray').mockResolvedValue(existing)
    const addSpy = vi.spyOn(db.habits, 'add').mockResolvedValue(2 as never)

    const dupResult = await addQuickHabitIfNew(makeHabit({ name: 'cold shower' }))
    expect(dupResult).toBe(false)
    expect(addSpy).not.toHaveBeenCalled()

    const newResult = await addQuickHabitIfNew(makeHabit({ name: 'Deep Work Block' }))
    expect(newResult).toBe(true)
    expect(addSpy).toHaveBeenCalledTimes(1)

    toArraySpy.mockRestore()
    addSpy.mockRestore()
  })

  it('round-trips backup export -> preview -> restore and upgrades v3 profiles', async () => {
    expect(db.verno).toBeGreaterThanOrEqual(3)

    const legacyProfile: Partial<UserProfile> = {
      id: 1,
      userName: 'Temew',
      streakFreezesAvailable: 2,
    }
    upgradeProfileV3(legacyProfile)
    expect(legacyProfile.userName).toBe('Temew')
    expect(legacyProfile.streakFreezesAvailable).toBe(2)
    expect(legacyProfile.smartSchedulerEnabled).toBe(true)
    expect(legacyProfile.smartScheduleTimes).toBe('{}')
    expect(legacyProfile.lastExportedAt).toBeNull()

    const sampleHabits = [makeHabit({ id: 1, name: 'Read 20 Pages' })]
    const sampleTasks = [makeTask({ id: 2, title: 'Ship Phase 3' })]
    vi.spyOn(db.habits, 'toArray').mockResolvedValue(sampleHabits)
    vi.spyOn(db.habitEntries, 'toArray').mockResolvedValue([])
    vi.spyOn(db.tasks, 'toArray').mockResolvedValue(sampleTasks)
    vi.spyOn(db.userProfile, 'toArray').mockResolvedValue([legacyProfile as UserProfile])
    vi.spyOn(db.bossChallenges, 'toArray').mockResolvedValue([])
    vi.spyOn(db.streakFreezes, 'toArray').mockResolvedValue([])

    const payload = await createBackupPayload()
    const file = new File([JSON.stringify(payload)], 'habitat-backup.json', {
      type: 'application/json',
    })
    const preview = await parseBackupPreview(file)
    expect(preview.habitsCount).toBe(1)
    expect(preview.tasksCount).toBe(1)

    const txSpy = vi.spyOn(db, 'transaction').mockImplementation((async (...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<unknown>
      return fn()
    }) as never)
    const habitsClear = vi.spyOn(db.habits, 'clear').mockResolvedValue()
    const entriesClear = vi.spyOn(db.habitEntries, 'clear').mockResolvedValue()
    const tasksClear = vi.spyOn(db.tasks, 'clear').mockResolvedValue()
    const profileClear = vi.spyOn(db.userProfile, 'clear').mockResolvedValue()
    const bossClear = vi.spyOn(db.bossChallenges, 'clear').mockResolvedValue()
    const freezeClear = vi.spyOn(db.streakFreezes, 'clear').mockResolvedValue()
    const habitsPut = vi.spyOn(db.habits, 'bulkPut').mockResolvedValue(1 as never)
    const tasksPut = vi.spyOn(db.tasks, 'bulkPut').mockResolvedValue(2 as never)
    const profilePut = vi.spyOn(db.userProfile, 'bulkPut').mockResolvedValue(1 as never)

    await restoreBackupData(preview.data, { saveSnapshot: false })
    expect(habitsClear).toHaveBeenCalled()
    expect(habitsPut).toHaveBeenCalledWith(sampleHabits)
    expect(tasksPut).toHaveBeenCalledWith(sampleTasks)
    expect(profilePut).toHaveBeenCalled()

    vi.restoreAllMocks()
    void entriesClear
    void tasksClear
    void profileClear
    void bossClear
    void freezeClear
  })

  it('picks smart scheduler default times based on timeOfDay', () => {
    const suggestions = getSmartHabitSuggestions(
      [
        makeHabit({ id: 1, name: 'Morning Run', timeOfDay: 'Morning' }),
        makeHabit({ id: 2, name: 'Evening Read', timeOfDay: 'Evening' }),
      ],
      { 1: '06:45' }
    )
    expect(suggestions[0].time24).toBe('06:45')
    expect(suggestions[0].displayTime).toBe('06:45 AM')
    expect(suggestions[1].time24).toBe('21:15')
    expect(suggestions[1].displayTime).toBe('09:15 PM')
  })
})

