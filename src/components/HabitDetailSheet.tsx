import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Flame, Trophy, Edit3, Trash2 } from 'lucide-react'
import type { Habit, HabitEntry } from '../db/types'
import { HabitIcon } from '../lib/habitIcons'
import { deleteHabit } from '../db/actions'
import { getTodayLocal, offsetDate, isHabitScheduledOn } from '../lib/streak'

interface HabitDetailSheetProps {
  habit: Habit | null
  entries: HabitEntry[]
  onClose: () => void
  onEdit: (habit: Habit) => void
}

export default function HabitDetailSheet({
  habit,
  entries,
  onClose,
  onEdit,
}: HabitDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const habitEntries = habit
    ? entries.filter((e) => e.habitId === habit.id)
    : []
  const completedDatesSet = new Set(
    habitEntries.filter((e) => e.isCompleted).map((e) => e.date)
  )
  const totalLogged = completedDatesSet.size

  const today = getTodayLocal()
  const last30Days = habit
    ? Array.from({ length: 30 }, (_, idx) => {
        const d = offsetDate(today, -(29 - idx))
        const done = completedDatesSet.has(d)
        const scheduled = isHabitScheduledOn(d, habit.frequency, habit.customDays)
        return { date: d, done, scheduled }
      })
    : []

  const handleDelete = async () => {
    if (!habit?.id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteHabit(habit.id)
      setConfirmDelete(false)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {habit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setConfirmDelete(false)
              onClose()
            }}
            className="absolute inset-0 bg-black/75"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[430px] rounded-t-[28px] bg-surface border-t border-x border-border-highlight p-5"
            style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)' }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center border"
                style={{
                  backgroundColor: habit.colorHex + '22',
                  borderColor: habit.colorHex + '55',
                }}
              >
                <HabitIcon iconName={habit.iconName} color={habit.colorHex} size={26} />
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false)
                  onClose()
                }}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-elevated flex items-center justify-center active:scale-95"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>

            {/* Name + meta */}
            <h2 className="text-[22px] font-bold text-text-primary mt-4 leading-snug">
              {habit.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 rounded-md bg-border text-text-secondary text-xs font-medium">
                {habit.category}
              </span>
              <span className="text-text-tertiary text-[13px]">• {habit.timeOfDay}</span>
            </div>

            {/* Streaks & Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <div className="rounded-[16px] bg-elevated border border-border p-3.5">
                <div className="flex items-center gap-1 text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                  <Flame size={13} className="text-amber" />
                  <span>CURRENT STREAK</span>
                </div>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {habit.currentStreak} days
                </p>
              </div>

              <div className="rounded-[16px] bg-elevated border border-border p-3.5">
                <div className="flex items-center gap-1 text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                  <Trophy size={13} className="text-gold" />
                  <span>BEST STREAK</span>
                </div>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {habit.bestStreak} days
                </p>
              </div>

              <div className="rounded-[16px] bg-elevated border border-border p-3.5">
                <div className="flex items-center gap-1 text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                  <span>TOTAL LOGGED</span>
                </div>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {totalLogged} days
                </p>
              </div>

              <div className="rounded-[16px] bg-elevated border border-border p-3.5">
                <div className="text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                  DAILY GOAL
                </div>
                <p className="text-lg font-bold text-orange mt-1">
                  {habit.targetCount} {habit.unit}
                </p>
              </div>
            </div>

            {/* Last 30 days dot row */}
            <div className="mt-4 rounded-[16px] bg-elevated border border-border p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                  LAST 30 DAYS
                </span>
                <span className="text-text-tertiary text-[11px]">
                  {totalLogged} logged
                </span>
              </div>
              <div className="grid grid-cols-15 gap-1.5">
                {last30Days.map((d) => (
                  <div
                    key={d.date}
                    title={d.date}
                    className="w-full aspect-square rounded-full"
                    style={{
                      backgroundColor: d.done
                        ? habit.colorHex
                        : d.scheduled
                          ? '#242430'
                          : '#14141A',
                      opacity: d.done ? 1 : d.scheduled ? 0.9 : 0.4,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Delete confirmation or Actions */}
            {confirmDelete ? (
              <div className="mt-5 rounded-[16px] bg-elevated border border-red/40 p-3.5 space-y-3">
                <p className="text-sm font-semibold text-text-primary text-center">
                  Delete &ldquo;{habit.name}&rdquo; and all its history?
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 min-h-[46px] rounded-[12px] bg-card text-text-primary text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 min-h-[46px] rounded-[12px] bg-red text-white text-sm font-bold"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEdit(habit)
                  }}
                  className="flex-1 min-h-[48px] rounded-[14px] bg-elevated border border-border text-text-primary font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 min-h-[48px] rounded-[14px] text-red font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255,69,58,0.14)' }}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

