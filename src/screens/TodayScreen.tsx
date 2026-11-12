import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Lock,
  Flame,
  Grid2X2,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
} from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'
import ProgressBar from '../components/ProgressBar'
import FAB from '../components/FAB'
import HabitCard from '../components/HabitCard'
import HabitStackCircuitView from '../components/HabitStackCircuitView'
import AddEditHabitSheet from '../components/AddEditHabitSheet'
import HabitDetailSheet from '../components/HabitDetailSheet'
import ParticleCelebration from '../components/ParticleCelebration'
import {
  useHabits,
  useHabitEntries,
  useAllEntries,
  useUserProfile,
} from '../db/hooks'
import { toggleHabitCompletion, incrementHabitCounter } from '../db/actions'
import { formatLocalDate, getTodayLocal, isHabitScheduledOn } from '../lib/streak'
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

  const [lockedToast, setLockedToast] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const prevDoneRef = useRef<number | null>(null)

  const profile = useUserProfile()
  const habits = useHabits()
  const entriesForDate = useHabitEntries(selectedDate)
  const allEntries = useAllEntries() ?? []

  const isLoading = habits === undefined || entriesForDate === undefined
  const isLocked = isFuture(selectedDate)

  // Current week Mon–Sun in local time
  const weekDays = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(now, i)
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
  }, [todayStr, selectedDate])

  const entryMap = useMemo(() => {
    return new Map((entriesForDate ?? []).map((e) => [e.habitId, e]))
  }, [entriesForDate])

  // Habits scheduled for selectedDate
  const scheduledHabits = useMemo(() => {
    if (!habits) return []
    return habits.filter((h) =>
      isHabitScheduledOn(selectedDate, h.frequency, h.customDays)
    )
  }, [habits, selectedDate])

  // Progress counts
  const totalScheduled = scheduledHabits.length
  const completedScheduledCount = useMemo(() => {
    return scheduledHabits.filter((h) => entryMap.get(h.id!)?.isCompleted === true).length
  }, [scheduledHabits, entryMap])

  const completionPercent = useMemo(() => {
    if (!habits || !entriesForDate) return 0
    return getDailyCompletionPercent(habits, entriesForDate, selectedDate)
  }, [habits, entriesForDate, selectedDate])

  // Best current streak among all active habits
  const maxStreak = useMemo(() => {
    if (!habits || habits.length === 0) return 0
    return Math.max(0, ...habits.map((h) => h.currentStreak))
  }, [habits])

  // Filter by timeOfDay (Anytime appears in All)
  const filteredHabits = useMemo(() => {
    if (selectedFilter === 'All') return scheduledHabits
    return scheduledHabits.filter(
      (h) => h.timeOfDay.toLowerCase() === selectedFilter.toLowerCase()
    )
  }, [scheduledHabits, selectedFilter])

  const activeHabits = filteredHabits.filter((h) => !entryMap.get(h.id!)?.isCompleted)
  const completedHabits = filteredHabits.filter((h) => entryMap.get(h.id!)?.isCompleted)

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

  const showLockedMessage = () => {
    setLockedToast('Future days are locked until they arrive.')
  }

  const handleSelectViewMode = (mode: TodayViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
    setViewMenuOpen(false)
  }

  const handleToggleHabit = async (habit: Habit) => {
    if (!habit.id) return
    if (isLocked) {
      showLockedMessage()
      return
    }
    await toggleHabitCompletion(habit.id, selectedDate, habit.targetCount)
  }

  const handleIncrementHabit = async (habit: Habit) => {
    if (!habit.id) return
    if (isLocked) {
      showLockedMessage()
      return
    }
    await incrementHabitCounter(habit.id, selectedDate, habit.targetCount)
  }

  const userName = profile?.userName || 'Alex'

  return (
    <Screen>
      <ParticleCelebration
        active={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

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

      <div className="px-5 pt-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
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

          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border mt-1 flex-shrink-0"
            style={{
              backgroundColor: 'rgba(255,106,0,0.14)',
              borderColor: 'rgba(255,106,0,0.4)',
            }}
          >
            <Flame size={14} color="#FF9F0A" fill="#FF9F0A" />
            <span className="text-amber text-xs font-extrabold">
              {maxStreak > 0 ? `${maxStreak} Days` : 'Daily Streak'}
            </span>
          </div>
        </div>

        {/* Week Strip */}
        <div className="flex gap-2">
          {weekDays.map((d) => {
            const selected = d.isSelected
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => {
                  if (d.isFuture) {
                    showLockedMessage()
                  } else {
                    setSelectedDate(d.dateStr)
                  }
                }}
                aria-label={d.isFuture ? `${d.dateStr} locked` : d.dateStr}
                className="flex-1 flex flex-col items-center justify-center rounded-[14px] border py-2 gap-0.5 transition-colors"
                style={{
                  backgroundColor: selected ? '#FF6A00' : '#14141A',
                  borderColor: selected
                    ? '#FF6A00'
                    : d.isToday
                      ? 'rgba(255,106,0,0.6)'
                      : '#22222E',
                  minHeight: 56,
                }}
              >
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: selected ? '#FFFFFF' : '#6E6E7A' }}
                >
                  {d.letter}
                </span>
                {d.isFuture ? (
                  <Lock size={13} color="#6E6E7A" className="my-0.5" />
                ) : (
                  <span
                    className="text-sm font-bold"
                    style={{ color: selected ? '#FFFFFF' : '#F7F7FA' }}
                  >
                    {d.num}
                  </span>
                )}
              </button>
            )
          })}
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
                {isLocked
                  ? 'Habits are locked until this day arrives'
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
            value={isLocked ? 0 : completionPercent / 100}
            height={5}
            color={completionPercent >= 100 ? '#30D158' : '#FF6A00'}
          />
        </div>

        {viewMode === 'CIRCUIT' ? (
          <HabitStackCircuitView
            habits={scheduledHabits}
            entryMap={entryMap}
            isLocked={isLocked}
            onToggleHabit={handleToggleHabit}
            onOpenDetail={(h) => setDetailHabit(h)}
            onLockedClick={showLockedMessage}
          />
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
                    className="h-20 rounded-[20px] bg-card border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : filteredHabits.length === 0 ? (
              <div className="rounded-[20px] bg-elevated border border-border p-8 text-center">
                <p className="text-4xl mb-3">🌱</p>
                <p className="text-text-primary font-semibold text-base">
                  No habits for this filter
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  Tap the + button to create a new habit.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {activeHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    entry={entryMap.get(habit.id!)}
                    isLocked={isLocked}
                    onToggle={() => handleToggleHabit(habit)}
                    onIncrement={() => handleIncrementHabit(habit)}
                    onOpenDetail={() => setDetailHabit(habit)}
                    onLockedClick={showLockedMessage}
                  />
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
                          <HabitCard
                            key={habit.id}
                            habit={habit}
                            entry={entryMap.get(habit.id!)}
                            isLocked={isLocked}
                            onToggle={() => handleToggleHabit(habit)}
                            onIncrement={() => handleIncrementHabit(habit)}
                            onOpenDetail={() => setDetailHabit(habit)}
                            onLockedClick={showLockedMessage}
                          />
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

      {/* Floating + button */}
      <FAB
        onClick={() => {
          setEditingHabit(null)
          setAddEditOpen(true)
        }}
        aria-label="Add habit"
      />

      {/* Add / Edit Bottom Sheet */}
      <AddEditHabitSheet
        open={addEditOpen}
        habitToEdit={editingHabit}
        onClose={() => {
          setAddEditOpen(false)
          setEditingHabit(null)
        }}
      />

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        habit={detailHabit}
        entries={allEntries}
        onClose={() => setDetailHabit(null)}
        onEdit={(h) => {
          setEditingHabit(h)
          setAddEditOpen(true)
        }}
      />
    </Screen>
  )
}
