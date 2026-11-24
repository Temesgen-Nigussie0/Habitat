import { describe, it, expect, beforeEach } from 'vitest'
import { computeWeeklyReview, isSundayEvening } from '../lib/weeklyReview'
import type { Habit, HabitEntry } from '../db/types'

const makeHabit = (id: number, name: string, timeOfDay: string): Habit => ({
  id,
  name,
  category: 'Health',
  iconName: 'target',
  colorHex: '#FF6A00',
  targetCount: 1,
  unit: 'times',
  timeOfDay,
  frequency: 'DAILY',
  customDays: '',
  currentStreak: 3,
  bestStreak: 5,
  lastCompletedDate: '2026-11-22',
  isArchived: false,
  startDate: '2026-11-01',
  createdAt: 1700000000000,
})

describe('weeklyReview', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('detects Sunday evening only on Sunday at or after 17:00', () => {
    expect(isSundayEvening(new Date(2026, 10, 22, 18, 0))).toBe(true) // Sunday 18:00
    expect(isSundayEvening(new Date(2026, 10, 22, 14, 0))).toBe(false) // Sunday 14:00
    expect(isSundayEvening(new Date(2026, 10, 23, 19, 0))).toBe(false) // Monday 19:00
  })

  it('computes week rate, delta vs last week, most consistent habit, hardest time, and adjustment', () => {
    const habits: Habit[] = [
      makeHabit(1, 'Morning Sunlight', 'Morning'),
      makeHabit(2, 'No Screens Before Bed', 'Evening'),
    ]

    const entries: HabitEntry[] = [
      // This week (2026-11-16 .. 2026-11-22): habit 1 done 6/7, habit 2 done 2/7 => 8/14 = 57%
      ...['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'].map(
        (date, idx) => ({
          id: idx + 1,
          habitId: 1,
          date,
          currentCount: 1,
          targetCount: 1,
          isCompleted: true,
          completedAt: 1,
          notes: '',
        })
      ),
      ...['2026-11-16', '2026-11-17'].map((date, idx) => ({
        id: 20 + idx,
        habitId: 2,
        date,
        currentCount: 1,
        targetCount: 1,
        isCompleted: true,
        completedAt: 1,
        notes: '',
      })),
      // Last week (2026-11-09 .. 2026-11-15): 4/14 = 29%
      ...['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map((date, idx) => ({
        id: 40 + idx,
        habitId: 1,
        date,
        currentCount: 1,
        targetCount: 1,
        isCompleted: true,
        completedAt: 1,
        notes: '',
      })),
    ]

    const review = computeWeeklyReview(
      habits,
      entries,
      ['2026-11-20', '2026-11-21', '2026-11-22'],
      '2026-11-22'
    )

    expect(review.thisWeekRate).toBe(57)
    expect(review.lastWeekRate).toBe(29)
    expect(review.delta).toBe(28)
    expect(review.bestStreak).toBe(7)
    expect(review.mostConsistentHabit?.name).toBe('Morning Sunlight')
    expect(review.hardestTimeOfDay?.timeOfDay).toBe('Evening')
    expect(review.suggestedAdjustment.toLowerCase()).toContain('evening')
  })
})
