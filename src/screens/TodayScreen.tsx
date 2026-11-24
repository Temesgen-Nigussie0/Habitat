import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Lock,
  Flame,
  Grid2X2,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
} from 'lucide-react'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'
import ProgressBar from '../components/ProgressBar'
import FAB from '../components/FAB'
import HabitCard from '../components/HabitCard'
import HabitStackCircuitView from '../components/HabitStackCircuitView'
import AddEditHabitSheet from '../components/AddEditHabitSheet'
import HabitDetailSheet from '../components/HabitDetailSheet'
import HabitTimerModal from '../components/HabitTimerModal'
import DailyStreakModal from '../components/DailyStreakModal'
import ParticleCelebration from '../components/ParticleCelebration'
import ActionToast, { type ActionToastData } from '../components/ActionToast'
import EmptyStateIllustration from '../components/EmptyStateIllustration'
import { useHabitTimers } from '../context/HabitTimerContext'
import {
  useHabits,
  useHabitEntries,
  useAllEntries,
  useTasks,
  useUserProfile,
  useStreakFreezes,
} from '../db/hooks'
import {
  toggleHabitCompletion,
  incrementHabitCounter,
  recalculateAllHabitStreaks,
} from '../db/actions'
import {
  calculateOverallDailyStreak,
  formatLocalDate,
  getAppStartDate,
  getHabitStartDate,
  getTodayLocal,
  isHabitScheduledOn,
  parseLocalDate,
  recordDailyVisit,
} from '../lib/streak'
import { getAmbientMood } from '../lib/ambientTheme'
import { getDailyCompletionPercent, isFuture } from '../lib/stats'
import type { Habit } from '../db/types'

type TodayViewMode = 'HABITS' | 'CIRCUIT'
const VIEW_MODE_KEY = 'habitat_today_view_mode'
const FILTERS = ['All', 'Morning', 'Afternoon', 'Evening'] as const

export default function TodayScreen() {
  const todayStr = getTodayLocal()
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedFilter, setSelectedFilter] = useState<string>('All')
  const [viewMode, setViewMode] = useState<TodayViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    return saved === 'CIRCUIT' ? 'CIRCUIT' : 'HABITS'
  })
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const [addEditOpen, setAddEditOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null)
  const [timerModalHabitId, setTimerModalHabitId] = useState<number | null>(null)
  const [streakModalOpen, setStreakModalOpen] = useState(false)
  const [isLevelUpModal, setIsLevelUpModal] = useState(false)
  const [visitedDates, setVisitedDates] = useState<string[]>(() =>
    recordDailyVisit(todayStr)
  )

  const {
    getSnapshot,
    toggleTimer,
    completionNotice,
    dismissCompletionNotice,
  } = useHabitTimers()

  const [lockedToast, setLockedToast] = useState<string | null>(null)
  const [actionToast, setActionToast] = useState<ActionToastData | null>(null)
  const [settlingHabitIds, setSettlingHabitIds] = useState<Set<number>>(new Set())
  const [skippedHabitIds, setSkippedHabitIds] = useState<Set<number>>(new Set())
  const [showCelebration, setShowCelebration] = useState(false)
  const prevDoneRef = useRef<number | null>(null)
  const selectedDayRef = useRef<HTMLButtonElement | null>(null)

  const profile = useUserProfile()
  const habits = useHabits()
  const tasks = useTasks() ?? []
  const entriesForDate = useHabitEntries(selectedDate)
  const allEntries = useAllEntries() ?? []
  const streakFreezes = useStreakFreezes() ?? []

  const tasksDone = useMemo(() => tasks.filter((t) => t.isCompleted).length, [tasks])
  const tasksTotal = tasks.length

  const isLoading = habits === undefined || entriesForDate === undefined
  const isFutureDate = isFuture(selectedDate)
  const isPast = selectedDate < todayStr
  const isLocked = isFutureDate || isPast

  // Record daily visit, refresh per-habit streaks, and celebrate next-day streak increase
  useEffect(() => {
    const lastDate = localStorage.getItem('habitat_last_visited_date')
    const lastLevelUpDate = localStorage.getItem('habitat_streak_levelup_date')

    setVisitedDates(recordDailyVisit(todayStr))
    localStorage.setItem('habitat_last_visited_date', todayStr)
    void recalculateAllHabitStreaks()

    if (lastDate && lastDate !== todayStr && lastLevelUpDate !== todayStr) {
      localStorage.setItem('habitat_streak_levelup_date', todayStr)
      setIsLevelUpModal(true)
      setStreakModalOpen(true)
    }
  }, [todayStr])

  const earliestEntryDate = useMemo(() => {
    if (!allEntries || allEntries.length === 0) return null
    const dates = allEntries.map((e) => e.date).filter(Boolean).sort()
    return dates[0] || null
  }, [allEntries])

  const appStartDate = useMemo(() => {
    return getAppStartDate(profile?.joinedAt, earliestEntryDate)
  }, [profile?.joinedAt, earliestEntryDate])

  // Days starting from the day user started the app up to 10 upcoming days (previewable, locked for edits)
  const weekDays = useMemo(() => {
    const startD = parseLocalDate(appStartDate)
    const todayD = parseLocalDate(todayStr)
    const diffDays = Math.max(0, differenceInCalendarDays(todayD, startD))
    const totalDays = diffDays + 1 + 10

    return Array.from({ length: totalDays }, (_, i) => {
      const d = addDays(startD, i)
      const dateStr = formatLocalDate(d)
      return {
        dateStr,
        letter: format(d, 'EEEEE'),
        num: format(d, 'd'),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isFuture: isFuture(dateStr),
      }
    })
  }, [appStartDate, todayStr, selectedDate])

  useEffect(() => {
    if (selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedDate])

  const entryMap = useMemo(() => {
    return new Map((entriesForDate ?? []).map((e) => [e.habitId, e]))
  }, [entriesForDate])

  // Habits scheduled for selectedDate (supports DAILY, WEEKDAYS, WEEKENDS, CUSTOM, INTERVAL)
  const scheduledHabits = useMemo(() => {
    if (!habits) return []
    return habits.filter((h) =>
      isHabitScheduledOn(
        selectedDate,
        h.frequency,
        h.customDays,
        h.intervalDays,
        getHabitStartDate(h)
      )
    )
  }, [habits, selectedDate])

  const timerModalHabit = useMemo(() => {
    if (timerModalHabitId === null || !habits) return null
    return habits.find((h) => h.id === timerModalHabitId) ?? null
  }, [timerModalHabitId, habits])

  // Progress counts
  const totalScheduled = scheduledHabits.length
  const completedScheduledCount = useMemo(() => {
    return scheduledHabits.filter((h) => entryMap.get(h.id!)?.isCompleted === true).length
  }, [scheduledHabits, entryMap])

  const completionPercent = useMemo(() => {
    if (!habits || !entriesForDate) return 0
    return getDailyCompletionPercent(habits, entriesForDate, selectedDate)
  }, [habits, entriesForDate, selectedDate])

  const freezeDates = useMemo(
    () => streakFreezes.map((f) => f.date),
    [streakFreezes]
  )
  const freezeDateSet = useMemo(() => new Set(freezeDates), [freezeDates])

  const historicalHabitBest = useMemo(() => {
    if (!habits || habits.length === 0) return 0
    return Math.max(0, ...habits.map((h) => h.bestStreak || h.currentStreak))
  }, [habits])

  // Overall daily app streak across all habits, tasks, daily check-ins, and streak freezes
  const dailyStreak = useMemo(() => {
    return calculateOverallDailyStreak({
      entries: allEntries,
      tasks,
      visitedDates,
      freezeDates,
      historicalBestStreak: historicalHabitBest,
      referenceDate: todayStr,
    })
  }, [allEntries, tasks, visitedDates, freezeDates, historicalHabitBest, todayStr])

  const maxStreak = dailyStreak.currentStreak
  const bestStreak = dailyStreak.bestStreak

  // Filter by timeOfDay (Anytime appears in All)
  const filteredHabits = useMemo(() => {
    if (selectedFilter === 'All') return scheduledHabits
    return scheduledHabits.filter(
      (h) => h.timeOfDay.toLowerCase() === selectedFilter.toLowerCase()
    )
  }, [scheduledHabits, selectedFilter])

  const activeHabits = filteredHabits.filter(
    (h) => !entryMap.get(h.id!)?.isCompleted || settlingHabitIds.has(h.id!)
  )
  const completedHabits = filteredHabits.filter(
    (h) => entryMap.get(h.id!)?.isCompleted && !settlingHabitIds.has(h.id!)
  )

  // Trigger particle celebration the first time all habits for today are completed
  useEffect(() => {
    if (selectedDate !== todayStr || isLoading) return
    const prevDone = prevDoneRef.current
    prevDoneRef.current = completedScheduledCount

    if (
      totalScheduled > 0 &&
      completedScheduledCount === totalScheduled &&
      prevDone !== null &&
      prevDone < totalScheduled
    ) {
      const celebratedKey = `habitat_celebrated_${todayStr}`
      if (!localStorage.getItem(celebratedKey)) {
        localStorage.setItem(celebratedKey, '1')
        setShowCelebration(true)
      }
    }
  }, [selectedDate, todayStr, isLoading, totalScheduled, completedScheduledCount])

  // Auto-dismiss locked toast
  useEffect(() => {
    if (!lockedToast) return
    const t = setTimeout(() => setLockedToast(null), 2600)
    return () => clearTimeout(t)
  }, [lockedToast])

  // Auto-dismiss bottom created/updated toast
  useEffect(() => {
    if (!actionToast) return
    const t = setTimeout(() => setActionToast(null), 2800)
    return () => clearTimeout(t)
  }, [actionToast])

  const showLockedMessage = () => {
    if (isPast) {
      setLockedToast("You missed it, buddy! ⏳ Time travel isn't invented yet — focus on winning today!")
    } else {
      setLockedToast("Whoa, slow down time traveler! 🚀 That day hasn't arrived yet — crush today first!")
    }
  }

  const handleSelectViewMode = (mode: TodayViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
    setViewMenuOpen(false)
  }

  // Load skipped habits for selectedDate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`habitat_skipped_habits_${selectedDate}`)
      const parsed = raw ? (JSON.parse(raw) as number[]) : []
      setSkippedHabitIds(new Set(Array.isArray(parsed) ? parsed : []))
    } catch {
      setSkippedHabitIds(new Set())
    }
  }, [selectedDate])

  const handleToggleSkipHabit = (habit: Habit) => {
    if (!habit.id || isLocked) return
    const id = habit.id
    setSkippedHabitIds((prev) => {
      const next = new Set(prev)
      const skipping = !next.has(id)
      if (skipping) next.add(id)
      else next.delete(id)
      try {
        localStorage.setItem(
          `habitat_skipped_habits_${selectedDate}`,
          JSON.stringify([...next])
        )
      } catch {
        // ignore
      }
      setActionToast({
        title: skipping ? `Skipped: ${habit.name}` : `Restored: ${habit.name}`,
        subtitle: skipping ? 'Marked skipped for today' : 'Back in your active list',
        variant: 'habit',
      })
      return next
    })
  }

  const triggerSettleGlide = (habitId: number) => {
    setSettlingHabitIds((prev) => {
      const next = new Set(prev)
      next.add(habitId)
      return next
    })
    window.setTimeout(() => {
      setSettlingHabitIds((prev) => {
        if (!prev.has(habitId)) return prev
        const next = new Set(prev)
        next.delete(habitId)
        return next
      })
    }, 650)
  }

  const handleToggleHabit = async (habit: Habit) => {
    if (!habit.id) return
    if (isLocked) {
      showLockedMessage()
      return
    }
    const existing = entryMap.get(habit.id)
    const willComplete =
      !existing?.isCompleted &&
      (habit.targetCount <= 1 || (existing?.currentCount ?? 0) + 1 >= habit.targetCount)
    if (willComplete) {
      triggerSettleGlide(habit.id)
    }
    await toggleHabitCompletion(habit.id, selectedDate, habit.targetCount)
  }

  const handleIncrementHabit = async (habit: Habit) => {
    if (!habit.id) return
    if (isLocked) {
      showLockedMessage()
      return
    }
    const existing = entryMap.get(habit.id)
    const willComplete =
      !existing?.isCompleted && (existing?.currentCount ?? 0) + 1 >= habit.targetCount
    if (willComplete) {
      triggerSettleGlide(habit.id)
    }
    await incrementHabitCounter(habit.id, selectedDate, habit.targetCount)
  }

  const handleToggleTimer = (habit: Habit) => {
    if (!habit.id) return
    if (isLocked) {
      showLockedMessage()
      return
    }
    toggleTimer(habit)
  }

  const userName = profile?.userName || 'Alex'
  const isNightMode = getAmbientMood().period === 'night'

  return (
    <Screen noNav={addEditOpen || streakModalOpen || Boolean(detailHabit) || Boolean(timerModalHabit)}>
      <ParticleCelebration
        active={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Timer Completion Chime Banner */}
      {completionNotice && (
        <div
          className="fixed left-5 right-5 z-[80] rounded-[16px] bg-[#16161C] border px-4 py-3 flex items-center justify-between gap-2.5 shadow-xl shadow-orange/20"
          style={{
            top: 'calc(env(safe-area-inset-top) + 12px)',
            borderColor: '#FF6A00',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FF6A00]/20 flex items-center justify-center flex-shrink-0">
              <Bell size={16} className="text-[#FF6A00]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {completionNotice.habitName} complete! 🎉
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                {completionNotice.minutes} min focus session logged
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissCompletionNotice}
            aria-label="Dismiss timer notice"
            className="p-1 text-text-secondary"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Locked Date Toast */}
      {lockedToast && (
        <div
          className="fixed left-5 right-5 z-40 rounded-[14px] bg-elevated border px-3.5 py-2.5 flex items-center justify-between gap-2"
          style={{
            top: 'calc(env(safe-area-inset-top) + 12px)',
            borderColor: 'rgba(255,106,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Lock size={15} className="text-orange flex-shrink-0" />
            <span className="text-xs text-text-primary font-medium">{lockedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setLockedToast(null)}
            aria-label="Dismiss"
            className="p-1 text-text-secondary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="px-5 space-y-5">
        {/* Top Hero Band: Header + Horizontal Dates (with Night Sky Backdrop in Night Mode) */}
        <div className="relative -mx-5 px-5 pt-4 pb-1 space-y-5">
          {isNightMode && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden select-none"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) * -1 - 4px)' }}
            >
              <img
                src="/images/night-sky.jpg"
                alt=""
                className="h-full w-full object-cover object-[72%_38%] opacity-35"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.10) 52%, rgba(0,0,0,0.92) 94%, #000000 100%)',
                }}
              />
            </div>
          )}

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewMenuOpen((v) => !v)}
                aria-label="Switch Today view mode"
                className="w-12 h-12 rounded-[14px] flex items-center justify-center border active:scale-95 transition-transform"
                style={{
                  backgroundColor: 'rgba(255,106,0,0.14)',
                  borderColor: 'rgba(255,106,0,0.45)',
                }}
              >
                {viewMode === 'CIRCUIT' ? (
                  <Zap size={22} color="#FF6A00" />
                ) : (
                  <Grid2X2 size={22} color="#FF6A00" />
                )}
              </button>

              {viewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setViewMenuOpen(false)}
                  />
                  <div
                    className="absolute left-0 top-14 z-40 w-60 rounded-[16px] bg-elevated border p-1.5 shadow-xl"
                    style={{ borderColor: 'rgba(255,106,0,0.35)' }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectViewMode('HABITS')}
                      className="w-full text-left px-3 py-2.5 rounded-[12px] flex items-center gap-2.5 transition-colors"
                      style={{
                        backgroundColor:
                          viewMode === 'HABITS' ? 'rgba(255,106,0,0.12)' : 'transparent',
                      }}
                    >
                      <Grid2X2
                        size={17}
                        color={viewMode === 'HABITS' ? '#FF6A00' : '#A0A0AB'}
                      />
                      <div>
                        <p
                          className="text-[13px] font-bold"
                          style={{
                            color: viewMode === 'HABITS' ? '#FF6A00' : '#F7F7FA',
                          }}
                        >
                          Habit Grid
                        </p>
                        <p className="text-[10px] text-text-tertiary">
                          Standard habit cards &amp; checklists
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectViewMode('CIRCUIT')}
                      className="w-full text-left px-3 py-2.5 rounded-[12px] flex items-center gap-2.5 transition-colors"
                      style={{
                        backgroundColor:
                          viewMode === 'CIRCUIT' ? 'rgba(255,106,0,0.12)' : 'transparent',
                      }}
                    >
                      <Zap
                        size={17}
                        color={viewMode === 'CIRCUIT' ? '#FF6A00' : '#A0A0AB'}
                      />
                      <div>
                        <p
                          className="text-[13px] font-bold"
                          style={{
                            color: viewMode === 'CIRCUIT' ? '#FF6A00' : '#F7F7FA',
                          }}
                        >
                          Routine Circuit
                        </p>
                        <p className="text-[10px] text-text-tertiary">
                          Sequential circadian loop stack
                        </p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="min-w-0">
              <SectionLabel>TODAY&apos;S RHYTHM</SectionLabel>
              <h1 className="text-[24px] font-bold text-text-primary leading-tight mt-0.5 truncate">
                Hello, {userName}
              </h1>
            </div>
          </div>

          <motion.button
            type="button"
            layoutId="streak-morph-badge"
            onClick={() => {
              setIsLevelUpModal(false)
              setStreakModalOpen(true)
            }}
            aria-label="View daily streak details"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border mt-1 flex-shrink-0 active:scale-95 transition-transform"
            style={{
              backgroundColor: 'rgba(255,106,0,0.14)',
              borderColor: 'rgba(255,106,0,0.4)',
            }}
          >
            <Flame size={14} color="#FF9F0A" fill="#FF9F0A" />
            <span className="text-amber text-xs font-extrabold tabular-nums">
              {maxStreak > 0
                ? `${maxStreak} ${maxStreak === 1 ? 'Day' : 'Days'}`
                : 'Daily Streak'}
            </span>
          </motion.button>
        </div>

        {/* Week Strip */}
        <div
          className="relative z-10 flex gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {weekDays.map((d) => {
            const selected = d.isSelected
            const isToday = d.isToday
            return (
              <button
                key={d.dateStr}
                ref={selected ? selectedDayRef : undefined}
                type="button"
                onClick={() => setSelectedDate(d.dateStr)}
                aria-label={d.isFuture ? `${d.dateStr} upcoming` : d.dateStr}
                className="min-w-[46px] flex-1 flex flex-col items-center justify-center rounded-[14px] py-2 gap-0.5 transition-colors shrink-0"
                style={{
                  backgroundColor: selected
                    ? isToday
                      ? '#FF6A00'
                      : 'rgba(255,106,0,0.16)'
                    : '#14141A',
                  borderColor: selected
                    ? '#FF6A00'
                    : isToday
                      ? 'rgba(255,106,0,0.6)'
                      : '#22222E',
                  borderWidth: selected ? 2 : 1,
                  borderStyle: 'solid',
                  minHeight: 56,
                  opacity: d.isFuture && !selected ? 0.72 : 1,
                }}
              >
                <span
                  className="text-[11px] font-semibold"
                  style={{
                    color: selected
                      ? isToday
                        ? '#FFFFFF'
                        : '#FF6A00'
                      : '#6E6E7A',
                  }}
                >
                  {d.letter}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: selected
                      ? isToday
                        ? '#FFFFFF'
                        : '#FF6A00'
                      : d.isFuture
                        ? '#8E8E93'
                        : '#F7F7FA',
                  }}
                >
                  {d.num}
                </span>
              </button>
            )
          })}
        </div>
        </div>

        {/* Progress Card */}
        <div
          className="rounded-[20px] border p-4"
          style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[19px] font-bold text-text-primary">
                {totalScheduled === 0
                  ? 'No habits configured'
                  : `${completedScheduledCount} of ${totalScheduled} completed`}
              </p>
              <p className="text-text-secondary text-sm mt-0.5">
                {isFutureDate
                  ? 'Upcoming day preview — unlocks when it arrives'
                  : isPast
                    ? 'Past day — view-only history'
                    : totalScheduled === 0
                      ? 'Tap the + button to add your first habit'
                      : completionPercent >= 100
                        ? 'Peak momentum maintained today'
                        : `${completionPercent}% of daily target achieved`}
              </p>
            </div>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor:
                  completionPercent >= 100 && !isLocked
                    ? 'rgba(48,209,88,0.16)'
                    : 'rgba(255,106,0,0.14)',
              }}
            >
              {isLocked ? (
                <Lock size={19} color="#6E6E7A" />
              ) : completionPercent >= 100 ? (
                <CheckCircle2 size={21} color="#30D158" />
              ) : (
                <Flame size={20} color="#FF6A00" fill="#FF6A00" />
              )}
            </div>
          </div>
          <ProgressBar
            value={isFutureDate ? 0 : completionPercent / 100}
            height={5}
            color={completionPercent >= 100 ? '#30D158' : '#FF6A00'}
          />
        </div>

        {viewMode === 'CIRCUIT' ? (
          <div className={isLocked ? 'opacity-60' : ''}>
            <HabitStackCircuitView
              habits={scheduledHabits}
              entryMap={entryMap}
              isLocked={isLocked}
              onToggleHabit={handleToggleHabit}
              onOpenDetail={(h) => setDetailHabit(h)}
              onLockedClick={showLockedMessage}
            />
          </div>
        ) : (
          <>
            {/* Time-of-day filter pills */}
            <div className="flex gap-2">
              {FILTERS.map((f) => {
                const active = selectedFilter === f
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFilter(f)}
                    className="flex-1 py-2 rounded-full text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: active ? '#FF6A00' : '#14141A',
                      color: active ? '#FFFFFF' : '#A0A0AB',
                      borderColor: active ? '#FF6A00' : '#22222E',
                      minHeight: 44,
                    }}
                  >
                    {f}
                  </button>
                )
              })}
            </div>

            {/* Habits List */}
            {isLoading ? (
              <div className="space-y-3 pb-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-20 rounded-[20px] border border-border skeleton-shimmer"
                  />
                ))}
              </div>
            ) : filteredHabits.length === 0 ? (
              <EmptyStateIllustration
                variant="habits"
                title={
                  selectedFilter === 'All'
                    ? 'No habits scheduled'
                    : `No ${selectedFilter.toLowerCase()} habits`
                }
                subtitle="Build relentless momentum one daily habit at a time."
                ctaLabel="Add First Habit"
                onAction={() => {
                  setEditingHabit(null)
                  setAddEditOpen(true)
                }}
              />
            ) : (
              <div className={`space-y-3 md:grid md:grid-cols-2 md:gap-3.5 md:space-y-0 pb-4 ${isLocked ? 'opacity-60' : ''}`}>
                {activeHabits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    layout
                    transition={{
                      layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                    }}
                  >
                    <HabitCard
                      habit={habit}
                      entry={entryMap.get(habit.id!)}
                      isLocked={isLocked}
                      isSkipped={skippedHabitIds.has(habit.id!)}
                      timerSnapshot={habit.hasTimer ? getSnapshot(habit) : undefined}
                      onToggle={() => handleToggleHabit(habit)}
                      onIncrement={() => handleIncrementHabit(habit)}
                      onToggleTimer={() => handleToggleTimer(habit)}
                      onOpenTimer={() => setTimerModalHabitId(habit.id ?? null)}
                      onSkipToday={() => handleToggleSkipHabit(habit)}
                      onOpenDetail={() => setDetailHabit(habit)}
                      onLockedClick={showLockedMessage}
                    />
                  </motion.div>
                ))}

                {/* Collapsed Completed Section */}
                {completedHabits.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2.5 my-2">
                      <div className="flex-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setCompletedExpanded((v) => !v)}
                        className="min-h-[36px] px-3 py-1 rounded-[10px] bg-elevated border flex items-center gap-1.5"
                        style={{ borderColor: 'rgba(255,106,0,0.4)' }}
                      >
                        <CheckCircle2 size={13} className="text-orange" />
                        <span className="text-orange text-[11px] font-bold tracking-[0.08em]">
                          COMPLETED ({completedHabits.length})
                        </span>
                        {completedExpanded ? (
                          <ChevronUp size={13} className="text-orange" />
                        ) : (
                          <ChevronDown size={13} className="text-orange" />
                        )}
                      </button>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {completedExpanded && (
                      <div className="space-y-3 mt-3">
                        {completedHabits.map((habit) => (
                          <motion.div
                            key={habit.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                              duration: 0.3,
                            }}
                          >
                            <HabitCard
                              habit={habit}
                              entry={entryMap.get(habit.id!)}
                              isLocked={isLocked}
                              timerSnapshot={habit.hasTimer ? getSnapshot(habit) : undefined}
                              onToggle={() => handleToggleHabit(habit)}
                              onIncrement={() => handleIncrementHabit(habit)}
                              onToggleTimer={() => handleToggleTimer(habit)}
                              onOpenTimer={() => setTimerModalHabitId(habit.id ?? null)}
                              onOpenDetail={() => setDetailHabit(habit)}
                              onLockedClick={showLockedMessage}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating + button (hidden while any modal/sheet is open) */}
      {!addEditOpen && !streakModalOpen && !detailHabit && !timerModalHabit && (
        <FAB
          onClick={() => {
            setEditingHabit(null)
            setAddEditOpen(true)
          }}
          aria-label="Add habit"
        />
      )}

      {/* Add / Edit Bottom Sheet */}
      <AddEditHabitSheet
        open={addEditOpen}
        habitToEdit={editingHabit}
        onClose={() => {
          setAddEditOpen(false)
          setEditingHabit(null)
        }}
        onSaved={({ name, isEdit, reminderTime }) => {
          setActionToast({
            title: isEdit ? `Habit updated: ${name}` : `Habit created: ${name}`,
            subtitle: reminderTime ? `Reminder set for ${reminderTime}` : 'Added to your daily rhythm',
            variant: 'habit',
          })
        }}
      />

      {/* Animated Bottom Action Toast */}
      <ActionToast toast={actionToast} onDismiss={() => setActionToast(null)} />

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        habit={detailHabit}
        entries={allEntries}
        onClose={() => setDetailHabit(null)}
        onEdit={(h) => {
          setEditingHabit(h)
          setAddEditOpen(true)
        }}
        canStartTimer={!isLocked && !(detailHabit?.id && entryMap.get(detailHabit.id)?.isCompleted)}
        onOpenTimer={(h) => setTimerModalHabitId(h.id ?? null)}
      />

      {/* Fullscreen Focus Timer Modal (Image 3 Style) */}
      <HabitTimerModal
        habit={timerModalHabit}
        onClose={() => setTimerModalHabitId(null)}
        onOpenDetail={(h) => setDetailHabit(h)}
      />

      {/* Daily Streak Status Modal */}
      <DailyStreakModal
        isOpen={streakModalOpen}
        onClose={() => {
          setStreakModalOpen(false)
          setIsLevelUpModal(false)
        }}
        currentStreak={maxStreak}
        bestStreak={bestStreak}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        habitsDone={completedScheduledCount}
        habitsScheduled={totalScheduled}
        completionPercent={completionPercent}
        isLevelUpMode={isLevelUpModal}
        activeDates={dailyStreak.activeDates}
        freezeDates={freezeDateSet}
      />
    </Screen>
  )
}
