import type { Habit, HabitEntry } from '../db/types'
import { isHabitScheduledOn, getTodayLocal } from './streak'

/**
 * Daily completion percentage for a given date.
 * Only counts habits that are scheduled on that day.
 * Returns 0–100 as a number.
 */
export function getDailyCompletionPercent(
  habits: Habit[],
  entries: HabitEntry[],
  date: string
): number {
  const scheduled = habits.filter(
    h => !h.isArchived && isHabitScheduledOn(date, h.frequency, h.customDays)
  )
  if (scheduled.length === 0) return 0

  const entryMap = new Map(entries.map(e => [e.habitId, e]))
  const done = scheduled.filter(h => entryMap.get(h.id!)?.isCompleted === true).length

  return Math.round((done / scheduled.length) * 100)
}

/** Returns true when the given yyyy-MM-dd is strictly in the future (after today local). */
export function isFuture(date: string): boolean {
  return date > getTodayLocal()
}

/** Returns true when the given yyyy-MM-dd is today (local). */
export function isToday(date: string): boolean {
  return date === getTodayLocal()
}

/** Display string for counter habits, e.g. "3/8" or "✓" for boolean completed. */
export function getCounterDisplay(entry: HabitEntry | undefined, targetCount: number): string {
  if (!entry) return `0/${targetCount}`
  if (targetCount <= 1) return entry.isCompleted ? '✓' : '0/1'
  return `${entry.currentCount}/${targetCount}`
}

/**
 * Map a preset habit name (from onboarding) to a full Habit object.
 * Mirrors the mapPresetToHabit() in HabitRepository.kt.
 */
export function mapPresetToHabit(name: string): Omit<Habit, 'id' | 'createdAt'> {
  const base: Omit<Habit, 'id' | 'createdAt' | 'name'> = {
    category: 'General',
    iconName: 'target',
    colorHex: '#FF6A00',
    targetCount: 1,
    unit: 'times',
    timeOfDay: 'Anytime',
    frequency: 'DAILY',
    customDays: '',
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    isArchived: false,
  }

  const presets: Record<string, Partial<typeof base>> = {
    'Drink 2L Water': {
      category: 'Health', iconName: 'water', colorHex: '#0A84FF',
      targetCount: 8, unit: 'glasses', timeOfDay: 'Anytime',
    },
    'Read 15 Pages': {
      category: 'Mind', iconName: 'book', colorHex: '#FF9F0A',
      targetCount: 1, unit: 'session', timeOfDay: 'Evening',
    },
    '10 Min Meditation': {
      category: 'Mind', iconName: 'meditation', colorHex: '#BF5AF2',
      targetCount: 1, unit: 'session', timeOfDay: 'Morning',
    },
    '30 Min Exercise / Walk': {
      category: 'Health', iconName: 'workout', colorHex: '#FF6A00',
      targetCount: 1, unit: 'workout', timeOfDay: 'Morning',
    },
    'Plan Top 3 Priorities': {
      category: 'Productivity', iconName: 'target', colorHex: '#30D158',
      targetCount: 1, unit: 'session', timeOfDay: 'Morning',
    },
    'No Screens 30m Before Bed': {
      category: 'Sleep', iconName: 'sleep', colorHex: '#64D2FF',
      targetCount: 1, unit: 'night', timeOfDay: 'Evening',
    },
    'Healthy Home Meal': {
      category: 'Health', iconName: 'meal', colorHex: '#30D158',
      targetCount: 1, unit: 'meal', timeOfDay: 'Afternoon',
    },
    '5 Min Morning Sunlight': {
      category: 'Routine', iconName: 'sunlight', colorHex: '#FFD60A',
      targetCount: 1, unit: 'viewing', timeOfDay: 'Morning',
    },
  }

  const preset = presets[name]
  return { ...base, ...preset, name }
}


