import { describe, expect, it } from 'vitest'
import { mergeSnapshots, type HabitatCloudSnapshot } from '../lib/cloudSync'
import { isSupabaseAuthConfigured } from '../lib/supabaseClient'
import type { Habit, Task } from '../db/types'

function makeHabit(overrides: Partial<Habit>): Habit {
  return {
    id: 1,
    name: 'Drink 2L Water',
    category: 'Health',
    iconName: 'water',
    colorHex: '#FF6A00',
    targetCount: 8,
    unit: 'times',
    timeOfDay: 'Anytime',
    frequency: 'DAILY',
    customDays: '',
    currentStreak: 1,
    bestStreak: 1,
    lastCompletedDate: null,
    createdAt: 1000,
    isArchived: false,
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Ship Cloud Sync',
    notes: '',
    category: 'Software Dev',
    priority: 'High',
    scope: 'Short-Term',
    dueDate: '2026-11-25',
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

describe('Cloud Sync mergeSnapshots', () => {
  it('merges habits, entries, tasks, freezes, and visitedDates without losing either device data', () => {
    const local: HabitatCloudSnapshot = {
      version: 1,
      updatedAt: 2000,
      userProfile: null,
      habits: [makeHabit({ id: 1, name: 'Meditate', bestStreak: 5, currentStreak: 3 })],
      habitEntries: [
        {
          id: 1,
          habitId: 1,
          habitName: 'Meditate',
          date: '2026-11-24',
          currentCount: 1,
          targetCount: 1,
          isCompleted: true,
          completedAt: 2000,
          notes: null,
        },
      ],
      tasks: [makeTask({ id: 1, title: 'Local Task', createdAt: 100 })],
      bossChallenges: [],
      streakFreezes: [{ date: '2026-11-20', habitId: null, createdAt: 100 }],
      visitedDates: ['2026-11-24', '2026-11-25'],
      appStartDate: '2026-11-24',
      accentThemeId: 'obsidian-orange',
    }

    const remote: HabitatCloudSnapshot = {
      version: 1,
      updatedAt: 3000,
      userProfile: null,
      habits: [
        makeHabit({ id: 10, name: 'Meditate', bestStreak: 7, currentStreak: 2 }),
        makeHabit({ id: 11, name: 'Read 15 Pages', bestStreak: 2, currentStreak: 2 }),
      ],
      habitEntries: [
        {
          id: 9,
          habitId: 11,
          habitName: 'Read 15 Pages',
          date: '2026-11-25',
          currentCount: 1,
          targetCount: 1,
          isCompleted: true,
          completedAt: 3000,
          notes: null,
        },
      ],
      tasks: [
        makeTask({ id: 1, title: 'Local Task', createdAt: 100, isCompleted: true }),
        makeTask({ id: 2, title: 'Remote Task', createdAt: 200 }),
      ],
      bossChallenges: [],
      streakFreezes: [{ date: '2026-11-21', habitId: null, createdAt: 200 }],
      visitedDates: ['2026-11-22', '2026-11-25'],
      appStartDate: '2026-11-22',
      accentThemeId: 'solar-gold',
    }

    const merged = mergeSnapshots(local, remote)

    expect(merged.habits.map((h) => h.name)).toEqual(['Meditate', 'Read 15 Pages'])
    expect(merged.habits.find((h) => h.name === 'Meditate')?.bestStreak).toBe(7)
    expect(merged.habitEntries).toHaveLength(2)
    expect(merged.tasks).toHaveLength(2)
    expect(merged.tasks.find((t) => t.title === 'Local Task')?.isCompleted).toBe(true)
    expect(merged.streakFreezes.map((f) => f.date)).toEqual(['2026-11-20', '2026-11-21'])
    expect(merged.visitedDates).toEqual(['2026-11-22', '2026-11-24', '2026-11-25'])
    expect(merged.appStartDate).toBe('2026-11-22')
    expect(merged.accentThemeId).toBe('solar-gold')
  })

  it('safely checks Supabase auth config flag in test environment', () => {
    expect(typeof isSupabaseAuthConfigured()).toBe('boolean')
  })
})
