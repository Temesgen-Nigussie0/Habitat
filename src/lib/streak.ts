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

const APP_START_DATE_KEY = 'habitat_app_start_date'

/**
 * Returns the local date string ('yyyy-MM-dd') when the user first started the app.
 * Persists in localStorage so past days from day 1 are preserved indefinitely.
 */
export function getAppStartDate(
  joinedAtTimestamp?: number | null,
  earliestEntryDate?: string | null
): string {
  const today = getTodayLocal()
  const stored = typeof window !== 'undefined' ? localStorage.getItem(APP_START_DATE_KEY) : null

  const candidates: string[] = []
  if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    candidates.push(stored)
  }
  if (joinedAtTimestamp && Number.isFinite(joinedAtTimestamp)) {
    candidates.push(formatLocalDate(new Date(joinedAtTimestamp)))
  }
  if (earliestEntryDate && /^\d{4}-\d{2}-\d{2}$/.test(earliestEntryDate)) {
    candidates.push(earliestEntryDate)
  }
  if (candidates.length === 0) {
    candidates.push(today)
  }

  candidates.sort()
  let earliest = candidates[0]
  if (earliest > today) {
    earliest = today
  }

  if (typeof window !== 'undefined' && stored !== earliest) {
    try {
      localStorage.setItem(APP_START_DATE_KEY, earliest)
    } catch {
      // ignore
    }
  }

  return earliest
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

const VISITED_DATES_KEY = 'habitat_visited_dates'

/**
 * Returns all locally recorded app check-in dates ('yyyy-MM-dd') from localStorage.
 */
export function getVisitedDates(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(VISITED_DATES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const dates = new Set<string>()
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
          dates.add(item)
        }
      }
    }
    const legacyKeys = ['habitat_last_visited_date', 'habitat_streak_levelup_date']
    for (const key of legacyKeys) {
      const val = localStorage.getItem(key)
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        dates.add(val)
      }
    }
    return [...dates].sort()
  } catch {
    return []
  }
}

/**
 * Records a date (defaults to today local) as an app check-in day in localStorage.
 * Returns the updated sorted list of visited dates.
 */
export function recordDailyVisit(dateStr: string = getTodayLocal()): string[] {
  if (typeof window === 'undefined') return [dateStr]
  const existing = new Set(getVisitedDates())
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    existing.add(dateStr)
  }
  const sorted = [...existing].sort()
  try {
    localStorage.setItem(VISITED_DATES_KEY, JSON.stringify(sorted))
  } catch {
    // ignore quota errors
  }
  return sorted
}

export interface DailyStreakSummary {
  currentStreak: number
  bestStreak: number
  activeDates: Set<string>
  lastActiveDate: string | null
  isActiveToday: boolean
}

/**
 * Calculates the user's overall daily app streak across all activity:
 *   - Completed habit entries (or logged counter progress) across ANY habit
 *   - Completed tasks (using completion date)
 *   - Recorded daily app check-in visits
 *   - Streak freeze dates
 */
export function calculateOverallDailyStreak(params: {
  entries: Array<{ date: string; isCompleted: boolean; currentCount?: number }>
  tasks: Array<{ isCompleted: boolean; completedAt: number | null; dueDate: string | null }>
  visitedDates?: string[]
  freezeDates?: string[]
  historicalBestStreak?: number
  referenceDate?: string
}): DailyStreakSummary {
  const today = params.referenceDate ?? getTodayLocal()
  const activeDates = new Set<string>()

  // 1. Habit completions & logged counter progress across all habits
  for (const e of params.entries) {
    if (
      (e.isCompleted || (e.currentCount ?? 0) > 0) &&
      e.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
      e.date <= today
    ) {
      activeDates.add(e.date)
    }
  }

  // 2. Completed tasks
  for (const t of params.tasks) {
    if (!t.isCompleted) continue
    const d = t.completedAt
      ? formatLocalDate(new Date(t.completedAt))
      : t.dueDate
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) {
      activeDates.add(d)
    }
  }

  // 3. Recorded daily check-in visits
  if (params.visitedDates) {
    for (const d of params.visitedDates) {
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) {
        activeDates.add(d)
      }
    }
  }

  const completedDatesList = [...activeDates].sort()
  const result = calculateStreak(
    completedDatesList,
    'DAILY',
    '',
    params.freezeDates ?? [],
    today
  )

  return {
    currentStreak: result.currentStreak,
    bestStreak: Math.max(
      result.bestStreak,
      result.currentStreak,
      params.historicalBestStreak ?? 0
    ),
    activeDates,
    lastActiveDate: result.lastCompletedDate,
    isActiveToday: result.isCompletedToday,
  }
}
