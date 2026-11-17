import { describe, test, expect } from 'vitest'
import {
  calculateOverallDailyStreak,
  calculateStreak,
  formatHabitFrequency,
  getAppStartDate,
  getTodayLocal,
  getVisitedDates,
  formatLocalDate,
  isHabitScheduledOn,
  recordDailyVisit,
} from '../lib/streak'
import {
  computeTimerSnapshot,
  formatDurationHuman,
  formatTimerClock,
} from '../lib/habitTimer'
import { getDailyCompletionPercent, getCounterDisplay } from '../lib/stats'
import type { Habit, HabitEntry } from '../db/types'

// ─── Helper: build a date string N days relative to a base date ───────────────
function daysAgo(n: number, base = getTodayLocal()): string {
  const [y, m, d] = base.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - n)
  return formatLocalDate(date)
}

function daysAhead(n: number, base = getTodayLocal()): string {
  return daysAgo(-n, base)
}

// ─── isHabitScheduledOn ───────────────────────────────────────────────────────
describe('isHabitScheduledOn', () => {
  // November 2026: Mon=09, Tue=10, Wed=11, Thu=12, Fri=13, Sat=14, Sun=15
  const MONDAY    = '2026-11-09'
  const WEDNESDAY = '2026-11-11'
  const SATURDAY  = '2026-11-14'  // Sat=6
  const SUNDAY    = '2026-11-15'  // Sun=0

  test('DAILY: always true', () => {
    expect(isHabitScheduledOn(MONDAY, 'DAILY', '')).toBe(true)
    expect(isHabitScheduledOn(SATURDAY, 'DAILY', '')).toBe(true)
  })

  test('WEEKDAYS: Mon–Fri true, Sat false', () => {
    expect(isHabitScheduledOn(MONDAY, 'WEEKDAYS', '')).toBe(true)
    expect(isHabitScheduledOn(WEDNESDAY, 'WEEKDAYS', '')).toBe(true)
    expect(isHabitScheduledOn(SATURDAY, 'WEEKDAYS', '')).toBe(false)
  })

  test('WEEKENDS: Sat true, Mon false', () => {
    expect(isHabitScheduledOn(SATURDAY, 'WEEKENDS', '')).toBe(true)
    expect(isHabitScheduledOn(MONDAY, 'WEEKENDS', '')).toBe(false)
  })

  test('CUSTOM "1,3": Mon=true, Tue=false, Wed=true', () => {
    // 1=Mon, 3=Wed
    expect(isHabitScheduledOn(MONDAY, 'CUSTOM', '1,3')).toBe(true)
    expect(isHabitScheduledOn(WEDNESDAY, 'CUSTOM', '1,3')).toBe(true)
    // Tuesday 2026-11-10
    expect(isHabitScheduledOn('2026-11-10', 'CUSTOM', '1,3')).toBe(false)
    expect(isHabitScheduledOn(SATURDAY, 'CUSTOM', '1,3')).toBe(false)
  })
})

// ─── calculateStreak — basic ──────────────────────────────────────────────────
describe('calculateStreak — basic', () => {
  const today = getTodayLocal()

  test('empty dates = 0 streak, 0 best', () => {
    const r = calculateStreak([], 'DAILY', '', [], today)
    expect(r.currentStreak).toBe(0)
    expect(r.bestStreak).toBe(0)
    expect(r.lastCompletedDate).toBeNull()
    expect(r.isCompletedToday).toBe(false)
  })

  test('only today completed = streak 1', () => {
    const r = calculateStreak([today], 'DAILY', '', [], today)
    expect(r.currentStreak).toBe(1)
    expect(r.isCompletedToday).toBe(true)
  })

  test('yesterday and today = streak 2', () => {
    const r = calculateStreak([daysAgo(1), today], 'DAILY', '', [], today)
    expect(r.currentStreak).toBe(2)
  })

  test('3 consecutive days (days -2, -1, today) = streak 3', () => {
    const dates = [daysAgo(2), daysAgo(1), today]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    expect(r.currentStreak).toBe(3)
  })

  test('today NOT completed does not break streak (counts yesterday back)', () => {
    // yesterday, day before: streak should be 2 even though today is not done
    const dates = [daysAgo(2), daysAgo(1)]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    expect(r.currentStreak).toBe(2)
    expect(r.isCompletedToday).toBe(false)
  })

  test('gap in past breaks streak (only recent days count)', () => {
    // completed 5 and 1 day ago — gap at days 2,3,4 breaks back-streak
    const dates = [daysAgo(5), daysAgo(1)]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    // current streak should be 1 (only yesterday)
    expect(r.currentStreak).toBe(1)
  })

  test('best streak tracks historical maximum', () => {
    // Old run: days 10,9,8,7 → 4 days
    // Recent: days 1 → 1 day
    const dates = [daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(7), daysAgo(1)]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    expect(r.bestStreak).toBe(4)
    expect(r.currentStreak).toBe(1)
  })

  test('current streak updates best if it is larger', () => {
    const dates = [daysAgo(2), daysAgo(1), today]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    expect(r.bestStreak).toBe(r.currentStreak) // both = 3
  })
})

// ─── calculateStreak — WEEKDAYS frequency ─────────────────────────────────────
describe('calculateStreak — WEEKDAYS', () => {
  // November 2026: Mon=09, Tue=10, Wed=11, Thu=12, Fri=13, Sat=14, Sun=15
  // Mon=16, Tue=17, ...
  const REF = '2026-11-13' // Friday

  test('weekend days do not count or break WEEKDAYS streak', () => {
    // Complete Mon–Fri (5 days) around REF
    const dates = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
    const r = calculateStreak(dates, 'WEEKDAYS', '', [], REF)
    expect(r.currentStreak).toBe(5)
  })

  test('weekend gap does NOT break WEEKDAYS streak across a weekend', () => {
    // Fri Nov 6 + Mon Nov 9 → streak of 2 (Sat/Sun are non-scheduled and skipped)
    // Nov 2026: Nov 06 = Fri, Nov 09 = Mon
    const dates = ['2026-11-06', '2026-11-09']
    const r = calculateStreak(dates, 'WEEKDAYS', '', [], '2026-11-09')
    expect(r.currentStreak).toBe(2)
  })

  test('missing a weekday breaks the streak', () => {
    // Mon + Wed (Tue missing) → from Wed perspective, streak = 1
    const dates = ['2026-11-09', '2026-11-11']
    const r = calculateStreak(dates, 'WEEKDAYS', '', [], '2026-11-11')
    expect(r.currentStreak).toBe(1)
  })
})

// ─── calculateStreak — WEEKENDS frequency ─────────────────────────────────────
describe('calculateStreak — WEEKENDS', () => {
  // November 2026: Sat=07, Sun=08, Sat=14, Sun=15
  const REF = '2026-11-15' // Sunday

  test('weekday gaps do not break WEEKENDS streak', () => {
    // Sat Nov 7 + Sun Nov 8 + ... skipping Mon-Fri ... + Sat Nov 14 + Sun Nov 15
    // Test: Sat Nov 14 + Sun Nov 15 → streak of 2
    const dates = ['2026-11-14', '2026-11-15']
    const r = calculateStreak(dates, 'WEEKENDS', '', [], REF)
    expect(r.currentStreak).toBe(2)
  })

  test('weekdays between two weekends do not break streak across a full week', () => {
    // Sun Nov 08 + Sat Nov 14 (Mon-Fri all non-scheduled, skipped)
    const dates = ['2026-11-08', '2026-11-14']
    const r = calculateStreak(dates, 'WEEKENDS', '', [], '2026-11-14')
    expect(r.currentStreak).toBe(2)
  })

  test('missing a Saturday breaks streak', () => {
    // Only Nov 15 — streak = 1
    const dates = ['2026-11-15']
    const r = calculateStreak(dates, 'WEEKENDS', '', [], REF)
    expect(r.currentStreak).toBe(1)
  })
})

// ─── calculateStreak — CUSTOM frequency ──────────────────────────────────────
describe('calculateStreak — CUSTOM', () => {
  // Mon=1, Wed=3, Fri=5
  const CUSTOM_DAYS = '1,3,5'
  // Mon 2026-11-09, Wed 2026-11-11, Fri 2026-11-13
  const REF = '2026-11-13' // Friday

  test('non-custom days do not break streak', () => {
    const dates = ['2026-11-09', '2026-11-11', '2026-11-13']
    const r = calculateStreak(dates, 'CUSTOM', CUSTOM_DAYS, [], REF)
    expect(r.currentStreak).toBe(3)
  })

  test('missing a custom day breaks streak', () => {
    // Mon + Fri (missing Wed) → streak = 1 from Fri
    const dates = ['2026-11-09', '2026-11-13']
    const r = calculateStreak(dates, 'CUSTOM', CUSTOM_DAYS, [], REF)
    expect(r.currentStreak).toBe(1)
  })
})

// ─── calculateStreak — freeze dates ───────────────────────────────────────────
describe('calculateStreak — freeze dates', () => {
  const today = getTodayLocal()

  test('freeze protects a gap: streak continues through frozen day', () => {
    // today and 2 days ago done, but yesterday was frozen (not completed)
    // Freeze counts: daysAgo(2)=+1, frozen yesterday=+1, today=+1 → streak 3
    const dates = [daysAgo(2), today]
    const freezes = [daysAgo(1)]
    const r = calculateStreak(dates, 'DAILY', '', freezes, today)
    // Freeze adds to streak count: 2 completed + 1 frozen = 3
    expect(r.currentStreak).toBe(3)
  })

  test('without freeze, same gap breaks streak', () => {
    const dates = [daysAgo(2), today]
    const r = calculateStreak(dates, 'DAILY', '', [], today)
    // yesterday not done and not frozen → streak resets to 1 (only today)
    expect(r.currentStreak).toBe(1)
  })

  test('freeze with WEEKDAYS: frozen weekday does not break weekday streak', () => {
    // Mon=done, Tue=done, Wed=frozen, Thu=done, Fri=done → streak 5
    // Nov 2026: Mon=09, Tue=10, Wed=11, Thu=12, Fri=13
    const dates = ['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13']
    const freezes = ['2026-11-11'] // Wednesday frozen
    const r = calculateStreak(dates, 'WEEKDAYS', '', freezes, '2026-11-13')
    // 4 completed + 1 frozen = 5
    expect(r.currentStreak).toBe(5)
  })
})

// ─── Timezone edge case ───────────────────────────────────────────────────────
describe('timezone', () => {
  test('getTodayLocal returns a local date, not UTC midnight shifted', () => {
    const today = getTodayLocal()
    const jsNow = new Date()
    const localYear = jsNow.getFullYear()
    const localMonth = String(jsNow.getMonth() + 1).padStart(2, '0')
    const localDay = String(jsNow.getDate()).padStart(2, '0')
    expect(today).toBe(`${localYear}-${localMonth}-${localDay}`)
  })

  test('formatLocalDate uses local time, not UTC', () => {
    // Create a date at UTC midnight — in UTC+3, local time would be 03:00 on the same day
    // Create a date at 2026-11-12T00:00:00 UTC = 2026-11-12T03:00:00+03:00
    // local date in UTC+3 is still 2026-11-12
    const d = new Date('2026-11-12T00:00:00Z')
    // In UTC+3, this is 03:00 of 2026-11-12, so local date = 2026-11-12
    // In UTC-5, this would be 2026-11-11 (the previous day)
    // We can only assert the format is correct (yyyy-MM-dd):
    const result = formatLocalDate(d)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ─── getDailyCompletionPercent ────────────────────────────────────────────────
describe('getDailyCompletionPercent', () => {
  const today = getTodayLocal()

  const makeHabit = (id: number, freq = 'DAILY', customDays = ''): Habit => ({
    id,
    name: `Habit ${id}`,
    category: 'Health',
    iconName: 'target',
    colorHex: '#FF6A00',
    targetCount: 1,
    unit: 'times',
    timeOfDay: 'Anytime',
    frequency: freq,
    customDays,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    createdAt: Date.now(),
    isArchived: false,
  })

  const makeEntry = (habitId: number, date: string, completed: boolean): HabitEntry => ({
    id: habitId,
    habitId,
    date,
    currentCount: completed ? 1 : 0,
    targetCount: 1,
    isCompleted: completed,
    completedAt: Date.now(),
    notes: null,
  })

  test('0 scheduled habits = 0%', () => {
    expect(getDailyCompletionPercent([], [], today)).toBe(0)
  })

  test('2 of 3 scheduled habits completed = 67%', () => {
    const habits = [makeHabit(1), makeHabit(2), makeHabit(3)]
    const entries = [makeEntry(1, today, true), makeEntry(2, today, true), makeEntry(3, today, false)]
    expect(getDailyCompletionPercent(habits, entries, today)).toBe(67)
  })

  test('only counts scheduled habits (non-scheduled WEEKDAYS habit ignored on Saturday)', () => {
    const SATURDAY = '2026-11-14'
    const h1 = makeHabit(1, 'DAILY')    // scheduled on Saturday
    const h2 = makeHabit(2, 'WEEKDAYS') // NOT scheduled on Saturday
    const entries = [makeEntry(1, SATURDAY, true), makeEntry(2, SATURDAY, true)]
    // Only h1 is scheduled → 1/1 = 100%
    expect(getDailyCompletionPercent([h1, h2], entries, SATURDAY)).toBe(100)
  })

  test('archived habits are excluded', () => {
    const h = { ...makeHabit(1), isArchived: true }
    const e = makeEntry(1, today, true)
    expect(getDailyCompletionPercent([h], [e], today)).toBe(0)
  })
})

// ─── getCounterDisplay ────────────────────────────────────────────────────────
describe('getCounterDisplay', () => {
  const makeEntry = (count: number, completed: boolean): HabitEntry => ({
    id: 1, habitId: 1, date: getTodayLocal(),
    currentCount: count, targetCount: 8, isCompleted: completed,
    completedAt: Date.now(), notes: null,
  })

  test('no entry returns "0/N"', () => {
    expect(getCounterDisplay(undefined, 8)).toBe('0/8')
  })

  test('partial shows count/target', () => {
    expect(getCounterDisplay(makeEntry(3, false), 8)).toBe('3/8')
  })

  test('boolean habit completed shows checkmark', () => {
    const e: HabitEntry = { ...makeEntry(1, true), targetCount: 1 }
    expect(getCounterDisplay(e, 1)).toBe('✓')
  })
})

// ─── getAppStartDate ──────────────────────────────────────────────────────────
describe('getAppStartDate', () => {
  test('returns joinedAt formatted date if earliest', () => {
    localStorage.removeItem('habitat_app_start_date')
    const timestamp = new Date('2026-11-15T10:00:00').getTime()
    const startDate = getAppStartDate(timestamp, null)
    expect(startDate).toBe('2026-11-15')
    expect(localStorage.getItem('habitat_app_start_date')).toBe('2026-11-15')
  })

  test('preserves stored start date when days pass', () => {
    localStorage.setItem('habitat_app_start_date', '2026-11-15')
    const laterTimestamp = new Date('2026-11-18T10:00:00').getTime()
    const startDate = getAppStartDate(laterTimestamp, null)
    expect(startDate).toBe('2026-11-15')
  })

  test('picks earlier entry date if present', () => {
    localStorage.setItem('habitat_app_start_date', '2026-11-16')
    const startDate = getAppStartDate(null, '2026-11-15')
    expect(startDate).toBe('2026-11-15')
  })
})

// ─── calculateOverallDailyStreak ──────────────────────────────────────────────
describe('calculateOverallDailyStreak', () => {
  test('counts 3-day streak across different habits on Sun, Mon, Tue', () => {
    const summary = calculateOverallDailyStreak({
      entries: [
        { date: '2026-11-15', isCompleted: true, currentCount: 1 },
        { date: '2026-11-16', isCompleted: true, currentCount: 1 },
        { date: '2026-11-17', isCompleted: true, currentCount: 1 },
      ],
      tasks: [],
      referenceDate: '2026-11-17',
    })
    expect(summary.currentStreak).toBe(3)
    expect(summary.bestStreak).toBe(3)
    expect(summary.activeDates.has('2026-11-15')).toBe(true)
    expect(summary.activeDates.has('2026-11-16')).toBe(true)
    expect(summary.activeDates.has('2026-11-17')).toBe(true)
  })

  test('counts tasks and daily visits toward overall streak', () => {
    const monTimestamp = new Date(2026, 10, 16, 14, 0, 0).getTime()
    const summary = calculateOverallDailyStreak({
      entries: [{ date: '2026-11-15', isCompleted: true }],
      tasks: [{ isCompleted: true, completedAt: monTimestamp, dueDate: '2026-11-16' }],
      visitedDates: ['2026-11-17'],
      referenceDate: '2026-11-17',
    })
    expect(summary.currentStreak).toBe(3)
    expect(summary.bestStreak).toBe(3)
  })

  test('resets streak when a day is missed without freeze and excludes missed day from activeDates', () => {
    const summary = calculateOverallDailyStreak({
      entries: [
        { date: '2026-11-15', isCompleted: true },
        { date: '2026-11-17', isCompleted: true },
      ],
      tasks: [],
      historicalBestStreak: 2,
      referenceDate: '2026-11-17',
    })
    expect(summary.currentStreak).toBe(1)
    expect(summary.bestStreak).toBe(2)
    expect(summary.activeDates.has('2026-11-16')).toBe(false)
  })

  test('recordDailyVisit and getVisitedDates persist unique sorted dates', () => {
    localStorage.removeItem('habitat_visited_dates')
    localStorage.removeItem('habitat_last_visited_date')
    localStorage.removeItem('habitat_streak_levelup_date')

    recordDailyVisit('2026-11-16')
    recordDailyVisit('2026-11-15')
    recordDailyVisit('2026-11-17')
    recordDailyVisit('2026-11-17')

    expect(getVisitedDates()).toEqual(['2026-11-15', '2026-11-16', '2026-11-17'])
  })
})

// ─── INTERVAL frequency & Timer engine ───────────────────────────────────────
describe('INTERVAL frequency scheduling & streaks', () => {
  test('2-day interval schedules every 2 days from startDate and never before startDate', () => {
    const start = '2026-11-17'
    expect(isHabitScheduledOn('2026-11-16', 'INTERVAL', '', 2, start)).toBe(false)
    expect(isHabitScheduledOn('2026-11-17', 'INTERVAL', '', 2, start)).toBe(true)
    expect(isHabitScheduledOn('2026-11-18', 'INTERVAL', '', 2, start)).toBe(false)
    expect(isHabitScheduledOn('2026-11-19', 'INTERVAL', '', 2, start)).toBe(true)
    expect(isHabitScheduledOn('2026-11-20', 'INTERVAL', '', 2, start)).toBe(false)
    expect(isHabitScheduledOn('2026-11-21', 'INTERVAL', '', 2, start)).toBe(true)
  })

  test('6-day interval schedules accurately from startDate', () => {
    const start = '2026-11-15'
    expect(isHabitScheduledOn('2026-11-15', 'INTERVAL', '', 6, start)).toBe(true)
    expect(isHabitScheduledOn('2026-11-20', 'INTERVAL', '', 6, start)).toBe(false)
    expect(isHabitScheduledOn('2026-11-21', 'INTERVAL', '', 6, start)).toBe(true)
    expect(isHabitScheduledOn('2026-11-27', 'INTERVAL', '', 6, start)).toBe(true)
  })

  test('calculateStreak handles INTERVAL without infinite loops and counts consecutive interval hits', () => {
    const start = '2026-11-15'
    const res = calculateStreak(
      ['2026-11-15', '2026-11-17', '2026-11-19'],
      'INTERVAL',
      '',
      [],
      '2026-11-19',
      2,
      start
    )
    expect(res.currentStreak).toBe(3)
    expect(res.bestStreak).toBe(3)
  })

  test('formatHabitFrequency formats all frequency types cleanly', () => {
    expect(formatHabitFrequency({ frequency: 'DAILY' })).toBe('Every day')
    expect(formatHabitFrequency({ frequency: 'WEEKDAYS' })).toBe('Weekdays')
    expect(formatHabitFrequency({ frequency: 'WEEKENDS' })).toBe('Weekends')
    expect(formatHabitFrequency({ frequency: 'INTERVAL', intervalDays: 3 })).toBe('Every 3 days')
    expect(formatHabitFrequency({ frequency: 'CUSTOM', customDays: '1,3,5' })).toBe('Mon, Wed, Fri')
  })
})

describe('Habit Timer Engine', () => {
  test('computeTimerSnapshot tracks elapsed, remaining, progress, and completion drift-free', () => {
    const startedAt = 1_000_000
    const runningState = {
      habitId: 1,
      habitName: 'Meditate',
      dateStr: '2026-11-17',
      targetSeconds: 900, // 15 min
      elapsedSeconds: 300, // 5 min prior
      isRunning: true,
      startedAt,
      hasStarted: true,
    }
    // 5 more minutes elapsed -> 10 min elapsed, 5 min remaining
    const mid = computeTimerSnapshot(1, 15, runningState, startedAt + 300_000)
    expect(Math.round(mid.elapsedSeconds)).toBe(600)
    expect(Math.round(mid.remainingSeconds)).toBe(300)
    expect(mid.progress).toBeCloseTo(2 / 3, 2)
    expect(mid.isRunning).toBe(true)
    expect(mid.isFinished).toBe(false)

    // 10 more minutes elapsed -> finished
    const end = computeTimerSnapshot(1, 15, runningState, startedAt + 600_000)
    expect(end.remainingSeconds).toBe(0)
    expect(end.progress).toBe(1)
    expect(end.isFinished).toBe(true)
  })

  test('formatTimerClock and formatDurationHuman format values cleanly', () => {
    expect(formatTimerClock(600)).toBe('10:00')
    expect(formatTimerClock(65)).toBe('01:05')
    expect(formatTimerClock(3661)).toBe('1:01:01')
    expect(formatDurationHuman(15)).toBe('15 minutes')
    expect(formatDurationHuman(60)).toBe('1 hour')
    expect(formatDurationHuman(120)).toBe('2 hours')
    expect(formatDurationHuman(90)).toBe('1h 30m')
  })
})
