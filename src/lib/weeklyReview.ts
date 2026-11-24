import type { Habit, HabitEntry } from '../db/types'
import {
  calculateOverallDailyStreak,
  formatLocalDate,
  getHabitStartDate,
  getTodayLocal,
  isHabitScheduledOn,
  offsetDate,
} from './streak'

export interface ConsistentHabitSummary {
  name: string
  iconName: string
  colorHex: string
  completedDays: number
  scheduledDays: number
  rate: number
}

export interface HardestTimeSummary {
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Anytime'
  rate: number
  missedCount: number
  totalCount: number
}

export interface WeeklyReviewData {
  weekStart: string
  weekEnd: string
  thisWeekRate: number
  lastWeekRate: number
  delta: number
  totalCompletedThisWeek: number
  totalScheduledThisWeek: number
  bestStreak: number
  currentStreak: number
  mostConsistentHabit: ConsistentHabitSummary | null
  hardestTimeOfDay: HardestTimeSummary | null
  suggestedAdjustment: string
}

const SUNDAY_REVIEW_DISMISSED_KEY = 'habitat_sunday_review_dismissed_date'

export function isSundayEvening(now: Date = new Date()): boolean {
  return now.getDay() === 0 && now.getHours() >= 17
}

export function shouldAutoShowSundayReview(now: Date = new Date()): boolean {
  if (!isSundayEvening(now)) return false
  if (typeof window === 'undefined') return false
  const today = formatLocalDate(now)
  return localStorage.getItem(SUNDAY_REVIEW_DISMISSED_KEY) !== today
}

export function dismissSundayReviewForToday(now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SUNDAY_REVIEW_DISMISSED_KEY, formatLocalDate(now))
  } catch {
    // ignore
  }
}

function computeWindowRate(
  activeHabits: Habit[],
  entrySet: Set<string>,
  endDate: string,
  daysCount: number
): { completed: number; scheduled: number; rate: number } {
  let completed = 0
  let scheduled = 0

  for (let i = 0; i < daysCount; i++) {
    const d = offsetDate(endDate, -i)
    for (const h of activeHabits) {
      if (
        h.id !== undefined &&
        isHabitScheduledOn(d, h.frequency, h.customDays, h.intervalDays, getHabitStartDate(h))
      ) {
        scheduled++
        if (entrySet.has(`${h.id}|${d}`)) {
          completed++
        }
      }
    }
  }

  return {
    completed,
    scheduled,
    rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
  }
}

export function computeWeeklyReview(
  habits: Habit[],
  entries: HabitEntry[],
  visitedDates: string[],
  refDate: string = getTodayLocal()
): WeeklyReviewData {
  const activeHabits = habits.filter((h) => !h.isArchived)
  const completedEntrySet = new Set<string>()
  for (const e of entries) {
    if (e.isCompleted) {
      completedEntrySet.add(`${e.habitId}|${e.date}`)
    }
  }

  const weekStart = offsetDate(refDate, -6)
  const lastWeekEnd = offsetDate(refDate, -7)

  const thisWeek = computeWindowRate(activeHabits, completedEntrySet, refDate, 7)
  const lastWeek = computeWindowRate(activeHabits, completedEntrySet, lastWeekEnd, 7)
  const delta = thisWeek.rate - lastWeek.rate

  const visitStreak = calculateOverallDailyStreak({
    entries,
    tasks: [],
    visitedDates,
    referenceDate: refDate,
  })
  const maxHabitBest = activeHabits.reduce(
    (max, h) => Math.max(max, h.bestStreak || 0, h.currentStreak || 0),
    0
  )
  const bestStreak = Math.max(visitStreak.bestStreak, maxHabitBest)

  // Most consistent habit in the last 7 days
  let mostConsistentHabit: ConsistentHabitSummary | null = null
  for (const h of activeHabits) {
    if (h.id === undefined) continue
    let hScheduled = 0
    let hCompleted = 0
    for (let i = 0; i < 7; i++) {
      const d = offsetDate(refDate, -i)
      if (isHabitScheduledOn(d, h.frequency, h.customDays, h.intervalDays, getHabitStartDate(h))) {
        hScheduled++
        if (completedEntrySet.has(`${h.id}|${d}`)) {
          hCompleted++
        }
      }
    }
    if (hScheduled === 0) continue
    const rate = Math.round((hCompleted / hScheduled) * 100)
    if (
      !mostConsistentHabit ||
      rate > mostConsistentHabit.rate ||
      (rate === mostConsistentHabit.rate && hCompleted > mostConsistentHabit.completedDays)
    ) {
      mostConsistentHabit = {
        name: h.name,
        iconName: h.iconName,
        colorHex: h.colorHex,
        completedDays: hCompleted,
        scheduledDays: hScheduled,
        rate,
      }
    }
  }

  // Hardest time of day in the last 7 days
  const timeBuckets: Record<'Morning' | 'Afternoon' | 'Evening' | 'Anytime', { done: number; total: number }> = {
    Morning: { done: 0, total: 0 },
    Afternoon: { done: 0, total: 0 },
    Evening: { done: 0, total: 0 },
    Anytime: { done: 0, total: 0 },
  }

  for (let i = 0; i < 7; i++) {
    const d = offsetDate(refDate, -i)
    for (const h of activeHabits) {
      if (
        h.id !== undefined &&
        isHabitScheduledOn(d, h.frequency, h.customDays, h.intervalDays, getHabitStartDate(h))
      ) {
        const slot =
          h.timeOfDay === 'Morning' || h.timeOfDay === 'Afternoon' || h.timeOfDay === 'Evening'
            ? h.timeOfDay
            : 'Anytime'
        timeBuckets[slot].total++
        if (completedEntrySet.has(`${h.id}|${d}`)) {
          timeBuckets[slot].done++
        }
      }
    }
  }

  const primarySlots: Array<'Morning' | 'Afternoon' | 'Evening'> = [
    'Morning',
    'Afternoon',
    'Evening',
  ]
  const populatedSlots = primarySlots.filter((s) => timeBuckets[s].total > 0)
  const slotsToCheck: Array<'Morning' | 'Afternoon' | 'Evening' | 'Anytime'> =
    populatedSlots.length > 0 ? populatedSlots : timeBuckets.Anytime.total > 0 ? ['Anytime'] : []

  let hardestTimeOfDay: HardestTimeSummary | null = null
  for (const slot of slotsToCheck) {
    const b = timeBuckets[slot]
    const rate = Math.round((b.done / b.total) * 100)
    const missedCount = b.total - b.done
    if (
      !hardestTimeOfDay ||
      rate < hardestTimeOfDay.rate ||
      (rate === hardestTimeOfDay.rate && missedCount > hardestTimeOfDay.missedCount)
    ) {
      hardestTimeOfDay = {
        timeOfDay: slot,
        rate,
        missedCount,
        totalCount: b.total,
      }
    }
  }

  // 1 rule-based suggested adjustment
  let suggestedAdjustment =
    'Keep your daily targets small and win at least 1 habit before noon every day.'

  if (activeHabits.length === 0) {
    suggestedAdjustment =
      'Add 2–3 tiny daily habits for next week so you can build an effortless baseline streak.'
  } else if (hardestTimeOfDay && hardestTimeOfDay.rate < 60 && hardestTimeOfDay.missedCount >= 2) {
    const altSlot = hardestTimeOfDay.timeOfDay === 'Evening' ? 'Morning' : 'an easier anchor'
    suggestedAdjustment = `Your ${hardestTimeOfDay.timeOfDay.toLowerCase()} habits hit ${hardestTimeOfDay.rate}% (${hardestTimeOfDay.missedCount} missed). Move 1 ${hardestTimeOfDay.timeOfDay.toLowerCase()} habit to ${altSlot} or shrink its target by half.`
  } else if (delta <= -10) {
    suggestedAdjustment = `Completion dipped ${Math.abs(delta)}% vs. last week. Focus on just your top 3 non-negotiable habits for the next 3 days to snap back.`
  } else if (thisWeek.rate >= 85) {
    suggestedAdjustment = `You crushed ${thisWeek.rate}% of your week! Raise the bar slightly on 1 key habit or lock in a 7-day consistency streak next week.`
  } else if (mostConsistentHabit && mostConsistentHabit.rate >= 70) {
    suggestedAdjustment = `Pair a tougher habit right after "${mostConsistentHabit.name}" (${mostConsistentHabit.rate}% this week) to ride your strongest routine.`
  }

  return {
    weekStart,
    weekEnd: refDate,
    thisWeekRate: thisWeek.rate,
    lastWeekRate: lastWeek.rate,
    delta,
    totalCompletedThisWeek: thisWeek.completed,
    totalScheduledThisWeek: thisWeek.scheduled,
    bestStreak,
    currentStreak: visitStreak.currentStreak,
    mostConsistentHabit,
    hardestTimeOfDay,
    suggestedAdjustment,
  }
}
