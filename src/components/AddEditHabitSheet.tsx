import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Clock, Timer } from 'lucide-react'
import { format } from 'date-fns'
import type { Habit } from '../db/types'
import { HABIT_ICONS } from '../lib/habitIcons'
import { insertHabit, updateHabit } from '../db/actions'
import { useHabits } from '../db/hooks'
import { scheduleHabitReminder } from '../lib/notifications'
import { getHabitStartDate, getTodayLocal, offsetDate, parseLocalDate } from '../lib/streak'

interface AddEditHabitSheetProps {
  open: boolean
  habitToEdit: Habit | null
  onClose: () => void
}

const CATEGORIES = ['Health', 'Mind', 'Productivity', 'Routine', 'Sleep', 'Growth']
const TIMES_OF_DAY = ['Morning', 'Afternoon', 'Evening', 'Anytime']
const FREQUENCIES = [
  { key: 'DAILY', label: 'Every day' },
  { key: 'WEEKDAYS', label: 'Weekdays' },
  { key: 'WEEKENDS', label: 'Weekends' },
  { key: 'CUSTOM', label: 'Custom days' },
  { key: 'INTERVAL', label: 'Interval days' },
] as const

const INTERVAL_OPTIONS = [1, 2, 3, 4, 5, 6] as const
const TIMER_PRESETS = [5, 10, 15, 25, 30, 45, 60, 120] as const

const WEEKDAY_BUTTONS = [
  { day: '1', label: 'Mon' },
  { day: '2', label: 'Tue' },
  { day: '3', label: 'Wed' },
  { day: '4', label: 'Thu' },
  { day: '5', label: 'Fri' },
  { day: '6', label: 'Sat' },
  { day: '0', label: 'Sun' },
]

export default function AddEditHabitSheet({
  open,
  habitToEdit,
  onClose,
}: AddEditHabitSheetProps) {
  const existingHabits = useHabits() ?? []

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Health')
  const [iconName, setIconName] = useState('workout')
  const [timeOfDay, setTimeOfDay] = useState('Morning')
  const [targetCount, setTargetCount] = useState(1)
  const [frequency, setFrequency] = useState('DAILY')
  const [customDays, setCustomDays] = useState<string[]>(['1', '3', '5'])
  const [intervalDays, setIntervalDays] = useState<number>(2)
  const [hasTimer, setHasTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState<number>(15)
  const [hasReminder, setHasReminder] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (habitToEdit) {
      setName(habitToEdit.name)
      setCategory(habitToEdit.category)
      setIconName(habitToEdit.iconName)
      setTimeOfDay(habitToEdit.timeOfDay)
      setTargetCount(habitToEdit.targetCount)
      setFrequency(habitToEdit.frequency || 'DAILY')
      setCustomDays(
        habitToEdit.customDays
          ? habitToEdit.customDays.split(',').map((s) => s.trim()).filter(Boolean)
          : ['1', '3', '5']
      )
      setIntervalDays(
        habitToEdit.intervalDays && habitToEdit.intervalDays >= 1 && habitToEdit.intervalDays <= 6
          ? habitToEdit.intervalDays
          : 2
      )
      setHasTimer(Boolean(habitToEdit.hasTimer && (habitToEdit.timerMinutes ?? 0) > 0))
      setTimerMinutes(habitToEdit.timerMinutes && habitToEdit.timerMinutes > 0 ? habitToEdit.timerMinutes : 15)
      if (habitToEdit.reminderTime) {
        setHasReminder(true)
        setReminderTime(habitToEdit.reminderTime)
      } else {
        setHasReminder(false)
        setReminderTime('08:00')
      }
    } else {
      setName('')
      setCategory('Health')
      setIconName('workout')
      setTimeOfDay('Morning')
      setTargetCount(1)
      setFrequency('DAILY')
      setCustomDays(['1', '3', '5'])
      setIntervalDays(2)
      setHasTimer(false)
      setTimerMinutes(15)
      setHasReminder(false)
      setReminderTime('08:00')
    }
    setError('')
  }, [open, habitToEdit])

  const anchorStartDate = habitToEdit ? getHabitStartDate(habitToEdit) : getTodayLocal()

  const intervalPreviewDates = useMemo(() => {
    return [0, 1, 2, 3].map((stepIdx) => {
      const dateStr = offsetDate(anchorStartDate, stepIdx * intervalDays)
      return format(parseLocalDate(dateStr), 'MMM d')
    })
  }, [anchorStartDate, intervalDays])

  const toggleCustomDay = (day: string) => {
    setCustomDays((prev) => {
      if (prev.includes(day)) {
        return prev.length > 1 ? prev.filter((d) => d !== day) : prev
      }
      return [...prev, day]
    })
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a habit name')
      return
    }
    const normalized = trimmed.toLowerCase()
    const duplicate = existingHabits.some(
      (h) =>
        h.id !== habitToEdit?.id &&
        h.name.trim().toLowerCase() === normalized
    )
    if (duplicate) {
      setError('A habit with this exact name already exists.')
      return
    }
    if (isSaving) return
    setIsSaving(true)
    try {
      const customDaysStr = frequency === 'CUSTOM' ? customDays.join(',') : ''
      const cleanInterval = frequency === 'INTERVAL' ? Math.max(1, Math.min(6, intervalDays)) : null
      const cleanStartDate = habitToEdit?.startDate ?? getTodayLocal()
      const cleanTimerMinutes = hasTimer
        ? Math.max(1, Math.min(480, Math.round(timerMinutes || 15)))
        : null
      const colorHex = '#FF6A00'
      const unit = hasTimer ? 'min' : 'times'
      const cleanTarget = hasTimer ? 1 : targetCount
      const cleanReminder = hasReminder && reminderTime.trim() ? reminderTime.trim() : null
      if (habitToEdit && habitToEdit.id !== undefined) {
        await updateHabit({
          ...habitToEdit,
          name: trimmed,
          category,
          iconName,
          colorHex,
          targetCount: cleanTarget,
          unit,
          timeOfDay,
          frequency,
          customDays: customDaysStr,
          intervalDays: cleanInterval,
          startDate: cleanStartDate,
          hasTimer,
          timerMinutes: cleanTimerMinutes,
          reminderTime: cleanReminder,
        })
      } else {
        await insertHabit({
          name: trimmed,
          category,
          iconName,
          colorHex,
          targetCount: cleanTarget,
          unit,
          timeOfDay,
          frequency,
          customDays: customDaysStr,
          intervalDays: cleanInterval,
          startDate: cleanStartDate,
          hasTimer,
          timerMinutes: cleanTimerMinutes,
          reminderTime: cleanReminder,
          currentStreak: 0,
          bestStreak: 0,
          lastCompletedDate: null,
          createdAt: Date.now(),
          isArchived: false,
        })
      }
      if (cleanReminder) {
        void scheduleHabitReminder(trimmed, cleanReminder)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[430px] max-h-[90dvh] rounded-t-[28px] bg-surface border-t border-x border-border-highlight flex flex-col overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle + Header */}
            <div className="px-5 pt-3 pb-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-text-primary">
                {habitToEdit ? 'Edit Habit' : 'New Habit'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-elevated flex items-center justify-center active:scale-95"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hidden">
              {/* 1. HABIT NAME */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  HABIT NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="e.g. Read 20 minutes"
                  className="w-full min-h-[48px] px-4 py-3 rounded-[14px] bg-elevated border border-border text-text-primary text-[16px] placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                />
                {error && <p className="text-red text-xs mt-1.5 font-medium">{error}</p>}
              </div>

              {/* 2. CATEGORY */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  CATEGORY
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const selected = category === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className="min-h-[40px] px-3.5 py-2 rounded-[12px] border text-[13px] transition-colors"
                        style={{
                          backgroundColor: selected ? 'rgba(255,106,0,0.14)' : '#14141A',
                          borderColor: selected ? '#FF6A00' : '#22222E',
                          color: selected ? '#FF6A00' : '#F7F7FA',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. ICON */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  ICON
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {HABIT_ICONS.map(({ key, label, Icon }) => {
                    const selected = iconName === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIconName(key)}
                        aria-label={label}
                        className="h-12 rounded-[12px] border flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: selected ? 'rgba(255,106,0,0.14)' : '#14141A',
                          borderColor: selected ? '#FF6A00' : '#22222E',
                        }}
                      >
                        <Icon size={20} color={selected ? '#FF6A00' : '#A0A0AB'} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. TIME OF DAY */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  TIME OF DAY
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMES_OF_DAY.map((t) => {
                    const selected = timeOfDay === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTimeOfDay(t)}
                        className="min-h-[44px] rounded-[12px] border text-xs transition-colors"
                        style={{
                          backgroundColor: selected ? 'rgba(255,106,0,0.14)' : '#14141A',
                          borderColor: selected ? '#FF6A00' : '#22222E',
                          color: selected ? '#FF6A00' : '#F7F7FA',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. FOCUS TIMER (Optional Countdown Mode) */}
              <div className="rounded-[14px] bg-elevated border border-border p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-orange/15 text-orange">
                      <Timer size={16} />
                    </div>
                    <div>
                      <span className="block text-[13px] font-semibold text-text-primary">
                        Focus Timer
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        Play button &amp; live countdown session
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasTimer}
                    aria-label="Toggle focus timer"
                    onClick={() => setHasTimer((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      hasTimer ? 'bg-orange' : 'bg-[#242428]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        hasTimer ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {hasTimer && (
                  <div className="mt-3.5 border-t border-border pt-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-orange text-[10px] font-bold tracking-[0.08em] uppercase">
                        DURATION (MINUTES)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTimerMinutes((m) => Math.max(1, m - 5))}
                          aria-label="Decrease timer minutes"
                          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"
                        >
                          <Minus size={14} className="text-text-primary" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={480}
                          value={timerMinutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (!Number.isNaN(val)) {
                              setTimerMinutes(Math.max(1, Math.min(480, val)))
                            } else {
                              setTimerMinutes(1)
                            }
                          }}
                          className="w-16 min-h-[38px] rounded-[10px] bg-[#14141A] border border-border text-center text-[16px] font-bold text-text-primary focus:outline-none focus:border-orange"
                        />
                        <button
                          type="button"
                          onClick={() => setTimerMinutes((m) => Math.min(480, m + 5))}
                          aria-label="Increase timer minutes"
                          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"
                        >
                          <Plus size={14} className="text-text-primary" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {TIMER_PRESETS.map((mins) => {
                        const active = timerMinutes === mins
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setTimerMinutes(mins)}
                            className="min-h-[38px] rounded-[10px] border text-xs font-bold transition-colors"
                            style={{
                              backgroundColor: active ? 'rgba(255,106,0,0.18)' : '#14141A',
                              borderColor: active ? '#FF6A00' : '#22222E',
                              color: active ? '#FF6A00' : '#A0A0AB',
                            }}
                          >
                            {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5b. DAILY TARGET (Hidden when Focus Timer is active) */}
              {!hasTimer && (
                <div>
                  <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                    DAILY TARGET
                  </label>
                  <div className="rounded-[14px] bg-elevated border border-border px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-text-primary text-[15px] font-semibold">
                        {targetCount} {targetCount === 1 ? 'time' : 'times'} per day
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setTargetCount((c) => Math.max(1, c - 1))}
                        aria-label="Decrease target"
                        className="w-11 h-11 rounded-full bg-card flex items-center justify-center active:scale-95"
                      >
                        <Minus size={16} className="text-text-primary" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetCount((c) => Math.min(20, c + 1))}
                        aria-label="Increase target"
                        className="w-11 h-11 rounded-full bg-card flex items-center justify-center active:scale-95"
                      >
                        <Plus size={16} className="text-text-primary" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. FREQUENCY */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  FREQUENCY
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCIES.map((f, idx) => {
                    const selected = frequency === f.key
                    const isFullRow = idx === FREQUENCIES.length - 1
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFrequency(f.key)}
                        className={`min-h-[44px] rounded-[12px] border text-[13px] transition-colors ${
                          isFullRow ? 'col-span-2' : ''
                        }`}
                        style={{
                          backgroundColor: selected ? 'rgba(255,106,0,0.14)' : '#14141A',
                          borderColor: selected ? '#FF6A00' : '#22222E',
                          color: selected ? '#FF6A00' : '#F7F7FA',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>

                {frequency === 'CUSTOM' && (
                  <div className="grid grid-cols-7 gap-1.5 mt-3">
                    {WEEKDAY_BUTTONS.map(({ day, label }) => {
                      const active = customDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleCustomDay(day)}
                          className="min-h-[44px] rounded-[12px] border text-[11px] font-bold transition-colors"
                          style={{
                            backgroundColor: active ? '#FF6A00' : '#14141A',
                            borderColor: active ? '#FF6A00' : '#22222E',
                            color: active ? '#FFFFFF' : '#A0A0AB',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {frequency === 'INTERVAL' && (
                  <div className="mt-3 rounded-[14px] bg-elevated border border-border p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange">
                        REPEAT INTERVAL
                      </span>
                      <span className="text-[12px] font-semibold text-text-primary">
                        Every {intervalDays} {intervalDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {INTERVAL_OPTIONS.map((days) => {
                        const active = intervalDays === days
                        return (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setIntervalDays(days)}
                            className="min-h-[42px] rounded-[10px] border text-xs font-bold transition-colors"
                            style={{
                              backgroundColor: active ? '#FF6A00' : '#14141A',
                              borderColor: active ? '#FF6A00' : '#22222E',
                              color: active ? '#FFFFFF' : '#A0A0AB',
                            }}
                          >
                            {days}d
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Schedule preview: <span className="text-text-primary font-semibold">{intervalPreviewDates.join(' → ')}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 7. REMIND ME (Optional Habit Reminder) */}
              <div className="rounded-[14px] bg-elevated border border-border p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-orange/15 text-orange">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="block text-[13px] font-semibold text-text-primary">
                        Remind Me
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        Daily notification reminder
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasReminder}
                    aria-label="Toggle habit reminder"
                    onClick={() => setHasReminder((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      hasReminder ? 'bg-orange' : 'bg-[#242428]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        hasReminder ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {hasReminder && (
                  <div className="mt-3 border-t border-border pt-3">
                    <label className="block text-orange text-[10px] font-bold tracking-[0.08em] uppercase mb-1.5">
                      REMINDER TIME
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      style={{ colorScheme: 'dark', boxSizing: 'border-box' }}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-[12px] bg-[#14141A] border border-border text-text-primary text-[15px] font-semibold focus:outline-none focus:border-orange"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Sticky Footer Save Button */}
            <div className="px-5 py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full min-h-[50px] rounded-[16px] font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-orange/20"
                style={{
                  backgroundColor: name.trim() ? '#FF6A00' : '#14141A',
                  color: name.trim() ? '#FFFFFF' : '#6E6E7A',
                }}
              >
                {habitToEdit ? 'Save Changes' : 'Create Habit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

