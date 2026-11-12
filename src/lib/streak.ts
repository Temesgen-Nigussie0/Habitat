// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Streak Calculator
// Ported from Android StreakCalculator.kt with three key fixes:
//   1. Freeze dates are actually used (Android repo forgot to pass them)
//   2. Habit frequency is respected — non-scheduled days are skipped
//   3. Today being unfinished never breaks the streak
// Dates are always local yyyy-MM-dd strings (never UTC).
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakResult {
  currentStreak: number
  bestStreak: number
  lastCompletedDate: string | null
  isCompletedToday: boolean
}

/** Returns today's date as 'yyyy-MM-dd' in LOCAL time (not UTC). */
export function getTodayLocal(): string {
  return formatLocalDate(new Date())
}

/** Formats a Date object as 'yyyy-MM-dd' using LOCAL year/month/day. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns the Date object for a local yyyy-MM-dd string (at midnight local time). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Returns the yyyy-MM-dd string for N days before or after a given date string. */
export function offsetDate(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatLocalDate(d)
}

/**
 * Returns true if the habit is scheduled on the given date string.
 * @param dateStr  Local yyyy-MM-dd
 * @param frequency  DAILY | WEEKDAYS | WEEKENDS | CUSTOM
 * @param customDays  Comma-separated day-of-week numbers (0=Sun … 6=Sat)
 */
export function isHabitScheduledOn(
  dateStr: string,
  frequency: string,
  customDays: string
): boolean {
  const dow = parseLocalDate(dateStr).getDay() // 0=Sun … 6=Sat
  switch (frequency) {
    case 'DAILY':
      return true
    case 'WEEKDAYS':
      return dow >= 1 && dow <= 5
    case 'WEEKENDS':
      return dow === 0 || dow === 6
    case 'CUSTOM': {
      if (!customDays) return false
      const days = customDays.split(',').map(s => parseInt(s.trim(), 10))
      return days.includes(dow)
    }
    default:
      return true
  }
}

/**
 * Calculates current streak, best streak, and today's completion status.
 *
 * Rules:
 * - Only scheduled days (per frequency) are considered.
 * - On a scheduled day that has a freeze, the streak is NOT broken.
 * - Today being incomplete does NOT break the streak.
 * - Best streak is the maximum run across all history (and at least currentStreak).
 */
export function calculateStreak(
  completedDates: string[],
  frequency: string = 'DAILY',
  customDays: string = '',
  freezeDates: string[] = [],
  referenceDate?: string
): StreakResult {
  const today = referenceDate ?? getTodayLocal()

  if (completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastCompletedDate: null, isCompletedToday: false }
  }

  const completedSet = new Set(completedDates)
  const freezeSet = new Set(freezeDates)
  const isCompletedToday = completedSet.has(today)

  const lastCompletedDate = [...completedDates].sort().reverse()[0] ?? null

  // ── Current streak ────────────────────────────────────────────────────────
  // Walk backwards from yesterday (or today if completed) counting consecutive
  // scheduled days that are either completed or frozen.

  let currentStreak = 0

  // Start: if today is complete, include it; then start walking from yesterday.
  // If today is NOT complete, start walking from yesterday immediately.
  let checkDate = isCompletedToday ? today : offsetDate(today, -1)

  if (isCompletedToday) {
    currentStreak = 1
    checkDate = offsetDate(today, -1)
  } else {
    // today not done — start looking at yesterday
    // If yesterday was neither completed nor frozen (and was scheduled), streak is 0
    // We will determine this in the loop below
  }

  // Walk backwards
  while (true) {
    if (!isHabitScheduledOn(checkDate, frequency, customDays)) {
      // Non-scheduled day — skip without penalty
      checkDate = offsetDate(checkDate, -1)
      continue
    }

    if (completedSet.has(checkDate)) {
      currentStreak++
      checkDate = offsetDate(checkDate, -1)
    } else if (freezeSet.has(checkDate)) {
      // Protected by freeze — counts toward the streak (the shield "did it for you")
      currentStreak++
      checkDate = offsetDate(checkDate, -1)
    } else {
      // Scheduled, not complete, not frozen — streak ends here
      break
    }
  }

  // ── Best streak ───────────────────────────────────────────────────────────
  // Walk through all sorted completed dates and find the longest consecutive run
  // (consecutive = only across scheduled days, with freeze gaps allowed).

  const sortedDates = [...completedDates].sort()
  let bestStreak = currentStreak
  let runStart = sortedDates[0]
  let runLength = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]
    const curr = sortedDates[i]

    // Count how many scheduled days lie strictly between prev and curr
    let gap = 0
    let d = offsetDate(prev, 1)
    while (d < curr) {
      if (isHabitScheduledOn(d, frequency, customDays) && !freezeSet.has(d)) {
        gap++
      }
      d = offsetDate(d, 1)
    }

    if (gap === 0) {
      // Consecutive (no unprotected scheduled days skipped)
      runLength++
    } else {
      // Gap found — record and restart
      bestStreak = Math.max(bestStreak, runLength)
      runStart = curr
      runLength = 1
    }
  }
  bestStreak = Math.max(bestStreak, runLength)

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate,
    isCompletedToday,
  }
}
