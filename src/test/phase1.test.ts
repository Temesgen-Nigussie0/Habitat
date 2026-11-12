import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Habit, HabitEntry, UserProfile } from '../db/types'
import { getDailyCompletionPercent, getCounterDisplay, isFuture, mapPresetToHabit } from '../lib/stats'
import { isHabitScheduledOn, offsetDate, getTodayLocal } from '../lib/streak'
import { buildProfileFromOnboarding, toggleStarterHabitSelection } from '../lib/onboarding'

// In-memory store for testing db actions without fake-indexeddb
const store = {
  habits: [] as Habit[],
  habitEntries: [] as HabitEntry[],
  userProfile: new Map<number, UserProfile>(),
  streakFreezes: [] as { id?: number; date: string; habitId: number | null; createdAt: number }[],
  nextHabitId: 1,
  nextEntryId: 1,
}

vi.mock('../db/db', () => {
  return {
    db: {
      transaction: async (...args: unknown[]) => {
        const fn = args[args.length - 1] as () => Promise<void>
        return await fn()
      },
      userProfile: {
        get: async (id: number) => store.userProfile.get(id),
        put: async (p: UserProfile) => {
          store.userProfile.set(p.id, p)
          return p.id
        },
        add: async (p: UserProfile) => {
          store.userProfile.set(p.id, p)
          return p.id
        },
      },
      habits: {
        count: async () => store.habits.length,
        get: async (id: number) => store.habits.find((h) => h.id === id),
        add: async (h: Omit<Habit, 'id'>) => {
          const id = store.nextHabitId++
          store.habits.push({ ...h, id })
          return id
        },
        put: async (h: Habit) => {
          const idx = store.habits.findIndex((x) => x.id === h.id)
          if (idx >= 0) store.habits[idx] = h
          else store.habits.push(h)
          return h.id
        },
        update: async (id: number, patch: Partial<Habit>) => {
          const idx = store.habits.findIndex((x) => x.id === id)
          if (idx >= 0) store.habits[idx] = { ...store.habits[idx], ...patch }
          return 1
        },
        bulkAdd: async (items: Omit<Habit, 'id'>[]) => {
          for (const item of items) {
            const id = store.nextHabitId++
            store.habits.push({ ...item, id })
          }
        },
      },
      habitEntries: {
        where: (index: string) => ({
          equals: (val: unknown) => {
            const filterFn = (e: HabitEntry) => {
              if (index === '[habitId+date]') {
                const [hid, d] = val as [number, string]
                return e.habitId === hid && e.date === d
              }
              if (index === 'habitId') return e.habitId === (val as number)
              return false
            }
            return {
              first: async () => store.habitEntries.find(filterFn),
              toArray: async () => store.habitEntries.filter(filterFn),
              delete: async () => {
                store.habitEntries = store.habitEntries.filter((e) => !filterFn(e))
              },
            }
          },
        }),
        add: async (e: Omit<HabitEntry, 'id'>) => {
          const id = store.nextEntryId++
          store.habitEntries.push({ ...e, id })
          return id
        },
        put: async (e: HabitEntry) => {
          const idx = store.habitEntries.findIndex((x) => x.id === e.id)
          if (idx >= 0) store.habitEntries[idx] = e
          return e.id
        },
        delete: async (id: number) => {
          store.habitEntries = store.habitEntries.filter((x) => x.id !== id)
        },
      },
      streakFreezes: {
        toArray: async () => store.streakFreezes,
      },
    },
  }
})

import { completeOnboarding, toggleHabitCompletion, incrementHabitCounter } from '../db/actions'

describe('Phase 1 — Onboarding, Counter Habits, Locked Days, Weekday Progress', () => {
  beforeEach(() => {
    store.habits = []
    store.habitEntries = []
    store.userProfile.clear()
    store.streakFreezes = []
    store.nextHabitId = 1
    store.nextEntryId = 1
  })

  it('starter habit selection blocks a 5th habit and allows deselecting', () => {
    let selected: string[] = []
    selected = toggleStarterHabitSelection(selected, 'Drink 2L Water')
    selected = toggleStarterHabitSelection(selected, 'Read 15 Pages')
    selected = toggleStarterHabitSelection(selected, '10 Min Meditation')
    selected = toggleStarterHabitSelection(selected, 'Healthy Home Meal')
    expect(selected).toHaveLength(4)

    // Attempt to add a 5th should be blocked
    selected = toggleStarterHabitSelection(selected, '5 Min Morning Sunlight')
    expect(selected).toHaveLength(4)
    expect(selected).not.toContain('5 Min Morning Sunlight')

    // Deselecting works
    selected = toggleStarterHabitSelection(selected, 'Read 15 Pages')
    expect(selected).toHaveLength(3)
  })

  it('onboarding finish creates the right habits and profile', async () => {
    const profileInput = buildProfileFromOnboarding({
      focusArea: 'Peak Productivity',
      currentConsistency: 'Fairly steady',
      frictionHurdle: 'Not enough time',
      targetHabitLoad: '3-4 Balanced Routine',
      primeZone: 'Early Morning (6:00 - 9:00 AM)',
      selectedHabits: ['Drink 2L Water', 'Read 15 Pages', '10 Min Meditation'],
      motivationStyle: 'Streak Counter & Heatmaps',
      timeCommitment: '15 - 30 minutes',
      briefingTime: '07:30 AM',
      pledgeAccepted: true,
      userName: 'Abi',
      headline: 'Software Engineer',
      selectedOccupations: ['Software Dev', 'Computer Science'],
    })

    await completeOnboarding(profileInput, [
      'Drink 2L Water',
      'Read 15 Pages',
      '10 Min Meditation',
    ])

    const savedProfile = store.userProfile.get(1)
    expect(savedProfile).toBeDefined()
    expect(savedProfile?.isOnboardingCompleted).toBe(true)
    expect(savedProfile?.pledgeAccepted).toBe(true)
    expect(savedProfile?.userName).toBe('Abi')
    expect(savedProfile?.headline).toBe('Software Engineer')
    expect(savedProfile?.focusArea).toBe('Peak Productivity')
    expect(savedProfile?.occupations).toBe('Software Dev, Computer Science')

    expect(store.habits).toHaveLength(3)
    const water = store.habits.find((h) => h.name === 'Drink 2L Water')
    expect(water).toMatchObject({
      category: 'Health',
      iconName: 'water',
      colorHex: '#0A84FF',
      targetCount: 8,
      unit: 'glasses',
      timeOfDay: 'Anytime',
    })
  })

  it('counter habit logic progresses from 0/8 to 8/8 and completes at target', async () => {
    const today = getTodayLocal()
    const waterPreset = mapPresetToHabit('Drink 2L Water')
    const habitId = 1
    store.habits.push({ ...waterPreset, id: habitId, createdAt: Date.now() })

    expect(getCounterDisplay(undefined, 8)).toBe('0/8')

    // Tap 1..7 should not complete
    for (let i = 1; i <= 7; i++) {
      await toggleHabitCompletion(habitId, today, 8)
      const entry = store.habitEntries.find((e) => e.habitId === habitId && e.date === today)
      expect(entry?.currentCount).toBe(i)
      expect(entry?.isCompleted).toBe(false)
      expect(getCounterDisplay(entry, 8)).toBe(`${i}/8`)
    }

    // Tap 8 completes the habit
    await toggleHabitCompletion(habitId, today, 8)
    const completedEntry = store.habitEntries.find((e) => e.habitId === habitId && e.date === today)
    expect(completedEntry?.currentCount).toBe(8)
    expect(completedEntry?.isCompleted).toBe(true)
    expect(getCounterDisplay(completedEntry, 8)).toBe('8/8')

    // incrementHabitCounter continues incrementing without un-completing
    await incrementHabitCounter(habitId, today, 8)
    const incremented = store.habitEntries.find((e) => e.habitId === habitId && e.date === today)
    expect(incremented?.currentCount).toBe(9)
    expect(incremented?.isCompleted).toBe(true)
  })

  it('locked future days cannot be toggled or incremented', async () => {
    const tomorrow = offsetDate(getTodayLocal(), 1)
    expect(isFuture(tomorrow)).toBe(true)

    store.habits.push({
      ...mapPresetToHabit('Read 15 Pages'),
      id: 1,
      createdAt: Date.now(),
    })

    const toggled = await toggleHabitCompletion(1, tomorrow, 1)
    const incremented = await incrementHabitCounter(1, tomorrow, 1)

    expect(toggled).toBe(false)
    expect(incremented).toBe(false)
    expect(store.habitEntries).toHaveLength(0)
  })

  it('progress count ignores a WEEKDAYS habit on a Saturday', () => {
    const saturday = '2026-11-14' // Saturday
    expect(isHabitScheduledOn(saturday, 'WEEKDAYS', '')).toBe(false)
    expect(isHabitScheduledOn(saturday, 'DAILY', '')).toBe(true)

    const habits: Habit[] = [
      { ...mapPresetToHabit('Read 15 Pages'), id: 1, frequency: 'WEEKDAYS', createdAt: 1 },
      { ...mapPresetToHabit('10 Min Meditation'), id: 2, frequency: 'DAILY', createdAt: 2 },
    ]

    const entries: HabitEntry[] = [
      {
        id: 1,
        habitId: 2,
        date: saturday,
        currentCount: 1,
        targetCount: 1,
        isCompleted: true,
        completedAt: Date.now(),
        notes: null,
      },
    ]

    // Only the DAILY habit is scheduled on Saturday, and it is completed => 100%
    expect(getDailyCompletionPercent(habits, entries, saturday)).toBe(100)
  })
})

