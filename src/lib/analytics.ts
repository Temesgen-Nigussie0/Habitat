import { format } from 'date-fns'
import type { BossChallenge, Habit, HabitEntry, Task } from '../db/types'
import {
  formatLocalDate,
  getTodayLocal,
  isHabitScheduledOn,
  offsetDate,
  parseLocalDate,
} from './streak'

export function getHabitConsistencyRate7Days(
  habits: Habit[],
  entries: HabitEntry[],
  referenceDate: string = getTodayLocal()
): number {
  const activeHabits = habits.filter((h) => !h.isArchived)
  if (activeHabits.length === 0) return 0

  const completedSet = new Set(
    entries
      .filter((e) => e.isCompleted)
      .map((e) => `${e.habitId}:${e.date}`)
  )

  let expected = 0
  let actual = 0

  for (let i = 0; i < 7; i++) {
    const dateStr = offsetDate(referenceDate, -i)
    for (const habit of activeHabits) {
      if (isHabitScheduledOn(dateStr, habit.frequency, habit.customDays)) {
        expected++
        if (habit.id !== undefined && completedSet.has(`${habit.id}:${dateStr}`)) {
          actual++
        }
      }
    }
  }

  if (expected === 0) return 0
  return Math.max(0, Math.min(100, Math.round((actual / expected) * 100)))
}

export function getTaskCompletionStats(tasks: Task[]): {
  done: number
  total: number
  pct: number
} {
  const total = tasks.length
  const done = tasks.filter((t) => t.isCompleted).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return { done, total, pct }
}

export function getTotalActionsCount(entries: HabitEntry[], tasks: Task[]): number {
  const completedEntries = entries.filter((e) => e.isCompleted).length
  const completedTasks = tasks.filter((t) => t.isCompleted).length
  return completedEntries + completedTasks
}

export interface HeatmapCell {
  dateString: string
  count: number
  dayOfWeekIndex: number
  monthName: string
  isFirstWeekOfMonth: boolean
}

export interface HeatmapResult {
  weeks: HeatmapCell[][]
  totalContributions: number
}

export function getHeatmapCellColor(count: number): string {
  if (count <= 0) return '#16161E'
  if (count === 1) return '#5A2508'
  if (count === 2) return '#B84500'
  if (count === 3) return '#FF6A00'
  return '#FFA233'
}

export function buildContributionDateMap(
  entries: HabitEntry[],
  tasks: Task[]
): Record<string, number> {
  const map: Record<string, number> = {}

  for (const entry of entries) {
    if (!entry.isCompleted) continue
    map[entry.date] = (map[entry.date] ?? 0) + 1
  }

  for (const task of tasks) {
    if (!task.isCompleted) continue
    const dateStr =
      typeof task.completedAt === 'number'
        ? formatLocalDate(new Date(task.completedAt))
        : task.dueDate
    if (dateStr) {
      map[dateStr] = (map[dateStr] ?? 0) + 1
    }
  }

  return map
}

export function getHeatmapData(
  entries: HabitEntry[],
  tasks: Task[],
  totalWeeks: number = 18,
  referenceDate: string = getTodayLocal()
): HeatmapResult {
  const dateMap = buildContributionDateMap(entries, tasks)

  // Find Monday of the week containing (referenceDate - (totalWeeks - 1) * 7)
  const startCursor = parseLocalDate(offsetDate(referenceDate, -(totalWeeks - 1) * 7))
  while (startCursor.getDay() !== 1) {
    startCursor.setDate(startCursor.getDate() - 1)
  }

  const weeks: HeatmapCell[][] = []
  let lastMonth = ''
  let totalContributions = 0

  for (let w = 0; w < totalWeeks; w++) {
    const weekCells: HeatmapCell[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = formatLocalDate(startCursor)
      const count = dateMap[dateStr] ?? 0
      totalContributions += count

      const monthName = format(startCursor, 'MMM')
      const isNewMonth = monthName !== lastMonth && d === 0
      if (d === 0 && monthName !== lastMonth) {
        lastMonth = monthName
      }

      weekCells.push({
        dateString: dateStr,
        count,
        dayOfWeekIndex: d,
        monthName,
        isFirstWeekOfMonth: isNewMonth,
      })

      startCursor.setDate(startCursor.getDate() + 1)
    }
    weeks.push(weekCells)
  }

  return { weeks, totalContributions }
}

export interface PillarScoresResult {
  dev: number
  video: number
  academics: number
  vitality: number
  balance: number
  status: 'OPTIMAL' | 'CALIBRATING'
}

export function getPillarScores(
  habits: Habit[],
  entries: HabitEntry[],
  tasks: Task[],
  referenceDate: string = getTodayLocal()
): PillarScoresResult {
  const categoryRate = (predicate: (cat: string) => boolean): number => {
    const matching = tasks.filter((t) => predicate(t.category))
    if (matching.length === 0) return 0
    const done = matching.filter((t) => t.isCompleted).length
    return Math.round((done / matching.length) * 100)
  }

  const dev = categoryRate((c) => c === 'Software Dev')
  const video = categoryRate((c) => c === 'Video & Photo')
  const academics = categoryRate((c) => c === 'Academics' || c === 'University')
  const vitality = getHabitConsistencyRate7Days(habits, entries, referenceDate)

  const balance = Math.round((dev + video + academics + vitality) / 4)
  const status = balance >= 75 ? 'OPTIMAL' : 'CALIBRATING'

  return { dev, video, academics, vitality, balance, status }
}

export interface DomainRow {
  name: string
  done: number
  total: number
  pct: number
  color: string
}

const DOMAIN_COLORS = ['#FF6A00', '#FF9F0A', '#0A84FF', '#FF453A']

export function getProductionDomains(
  tasks: Task[],
  habits: Habit[],
  entries: HabitEntry[],
  referenceDate: string = getTodayLocal()
): {
  taskDomains: DomainRow[]
  dailyHabits: { completedToday: number; scheduledToday: number; pct: number } | null
} {
  const grouped = new Map<string, Task[]>()
  for (const task of tasks) {
    const cat = task.category || 'Personal'
    const list = grouped.get(cat) ?? []
    list.push(task)
    grouped.set(cat, list)
  }

  const taskDomains: DomainRow[] = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
    .map(([name, catTasks], idx) => {
      const total = catTasks.length
      const done = catTasks.filter((t) => t.isCompleted).length
      const pct = total === 0 ? 0 : Math.round((done / total) * 100)
      return {
        name,
        done,
        total,
        pct,
        color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
      }
    })

  const scheduledTodayHabits = habits.filter(
    (h) => !h.isArchived && isHabitScheduledOn(referenceDate, h.frequency, h.customDays)
  )

  const dailyHabits =
    scheduledTodayHabits.length === 0
      ? null
      : (() => {
          const doneTodayIds = new Set(
            entries
              .filter((e) => e.date === referenceDate && e.isCompleted)
              .map((e) => e.habitId)
          )
          const completedToday = scheduledTodayHabits.filter(
            (h) => h.id !== undefined && doneTodayIds.has(h.id)
          ).length
          const scheduledToday = scheduledTodayHabits.length
          const pct = Math.round((completedToday / scheduledToday) * 100)
          return { completedToday, scheduledToday, pct }
        })()

  return { taskDomains, dailyHabits }
}

export interface MilestoneBadgeData {
  id: string
  title: string
  description: string
  accentColor: string
  isUnlocked: boolean
  unlockRequirement: string
}

export function getMilestoneBadges(
  habits: Habit[],
  entries: HabitEntry[],
  activeBossChallenge?: BossChallenge | null
): MilestoneBadgeData[] {
  const completedCount = entries.filter((e) => e.isCompleted).length
  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, h.bestStreak ?? 0, h.currentStreak ?? 0),
    0
  )

  return [
    {
      id: 'ignition',
      title: 'Ignition Spark',
      description: 'Completed your very first daily habit action.',
      accentColor: '#FF9F0A',
      isUnlocked: completedCount >= 1,
      unlockRequirement: 'Log 1 habit completion',
    },
    {
      id: '7_streak',
      title: '7-Day Vanguard',
      description: 'Maintained an unbroken habit streak across a full week.',
      accentColor: '#FF6A00',
      isUnlocked: bestStreak >= 7,
      unlockRequirement: 'Reach a 7-day streak on any habit',
    },
    {
      id: '21_habit',
      title: '21-Day Protocol',
      description: 'Rapid habit installation protocol successfully established.',
      accentColor: '#FFD60A',
      isUnlocked: bestStreak >= 21,
      unlockRequirement: 'Reach a 21-day streak on any habit',
    },
    {
      id: 'boss_conqueror',
      title: 'Boss Conqueror',
      description: 'Accepted and active in a binding Boss Mode behavioral challenge.',
      accentColor: '#FF453A',
      isUnlocked: Boolean(activeBossChallenge?.isActive),
      unlockRequirement: 'Initiate an active Boss Mode challenge',
    },
    {
      id: 'iron_will',
      title: 'Iron Will 66',
      description: 'Hit the Lally psychological standard for automatic habit wiring.',
      accentColor: '#30D158',
      isUnlocked: bestStreak >= 66,
      unlockRequirement: 'Reach a 66-day streak on any habit',
    },
    {
      id: 'century_club',
      title: 'Century Master',
      description: '100 recorded habit victories. True personal mastery.',
      accentColor: '#FFB800',
      isUnlocked: completedCount >= 100,
      unlockRequirement: 'Log 100 habit completions',
    },
  ]
}

export interface SmartHabitSuggestion {
  habitId: number
  habitName: string
  time24: string
  displayTime: string
  reason: string
}

export function formatTime24To12(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return time24
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

export function getSmartHabitSuggestions(
  habits: Habit[],
  savedTimesMap: Record<number, string> = {}
): SmartHabitSuggestion[] {
  const active = habits.filter((h) => !h.isArchived && h.id !== undefined)
  return active.map((habit) => {
    const tod = (habit.timeOfDay || '').toLowerCase()
    let defaultTime = '12:30'
    let reason = 'Optimal midday habit trigger'

    if (tod.includes('morning')) {
      defaultTime = '07:15'
      reason = 'Peak morning circadian energy detected'
    } else if (tod.includes('evening') || tod.includes('night')) {
      defaultTime = '21:15'
      reason = 'Evening wind-down routine rhythm'
    } else if (tod.includes('afternoon')) {
      defaultTime = '12:30'
      reason = 'Optimal midday habit trigger'
    }

    const time24 = savedTimesMap[habit.id!] || defaultTime
    return {
      habitId: habit.id!,
      habitName: habit.name,
      time24,
      displayTime: formatTime24To12(time24),
      reason,
    }
  })
}

