import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Check } from 'lucide-react'
import type { Habit } from '../db/types'
import { HABIT_ICONS, HABIT_COLORS } from '../lib/habitIcons'
import { insertHabit, updateHabit } from '../db/actions'

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
] as const

const WEEKDAY_BUTTONS = [
  { day: '1', label: 'M' },
  { day: '2', label: 'T' },
  { day: '3', label: 'W' },
  { day: '4', label: 'T' },
  { day: '5', label: 'F' },
  { day: '6', label: 'S' },
  { day: '0', label: 'S' },
]

export default function AddEditHabitSheet({
  open,
  habitToEdit,
  onClose,
}: AddEditHabitSheetProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Health')
  const [iconName, setIconName] = useState('workout')
  const [timeOfDay, setTimeOfDay] = useState('Morning')
  const [targetCount, setTargetCount] = useState(1)
  const [unit, setUnit] = useState('times')
  const [colorHex, setColorHex] = useState('#FF6A00')
  const [frequency, setFrequency] = useState('DAILY')
  const [customDays, setCustomDays] = useState<string[]>(['1', '3', '5'])
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
      setUnit(habitToEdit.unit)
      setColorHex(habitToEdit.colorHex)
      setFrequency(habitToEdit.frequency || 'DAILY')
      setCustomDays(
        habitToEdit.customDays
          ? habitToEdit.customDays.split(',').map((s) => s.trim()).filter(Boolean)
          : ['1', '3', '5']
      )
    } else {
      setName('')
      setCategory('Health')
      setIconName('workout')
      setTimeOfDay('Morning')
      setTargetCount(1)
      setUnit('times')
      setColorHex('#FF6A00')
      setFrequency('DAILY')
      setCustomDays(['1', '3', '5'])
    }
    setError('')
  }, [open, habitToEdit])

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
    if (isSaving) return
    setIsSaving(true)
    try {
      const customDaysStr = frequency === 'CUSTOM' ? customDays.join(',') : ''
      if (habitToEdit && habitToEdit.id !== undefined) {
        await updateHabit({
          ...habitToEdit,
          name: trimmed,
          category,
          iconName,
          colorHex,
          targetCount,
          unit: unit.trim() || 'times',
          timeOfDay,
          frequency,
          customDays: customDaysStr,
        })
      } else {
        await insertHabit({
          name: trimmed,
          category,
          iconName,
          colorHex,
          targetCount,
          unit: unit.trim() || 'times',
          timeOfDay,
          frequency,
          customDays: customDaysStr,
          currentStreak: 0,
          bestStreak: 0,
          lastCompletedDate: null,
          createdAt: Date.now(),
          isArchived: false,
        })
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
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
                        onClick={() => {
                          setIconName(key)
                          if (key === 'water' && unit === 'times') {
                            setUnit('glasses')
                          }
                        }}
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

              {/* 5. DAILY TARGET */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  DAILY TARGET
                </label>
                <div className="rounded-[14px] bg-elevated border border-border px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-text-primary text-[15px] font-semibold">
                      {targetCount} {unit} per day
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
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">Unit:</span>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="times, glasses, pages..."
                    className="flex-1 min-h-[40px] px-3 py-1.5 rounded-[10px] bg-elevated border border-border text-text-primary text-[16px] focus:outline-none focus:border-orange"
                  />
                </div>
              </div>

              {/* 6. COLOR */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  COLOR
                </label>
                <div className="flex flex-wrap gap-3">
                  {HABIT_COLORS.map((hex) => {
                    const selected = colorHex.toUpperCase() === hex.toUpperCase()
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColorHex(hex)}
                        aria-label={`Color ${hex}`}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
                        style={{
                          backgroundColor: hex,
                          boxShadow: selected ? `0 0 0 2px #0E0E12, 0 0 0 4px ${hex}` : 'none',
                        }}
                      >
                        {selected && <Check size={18} color="#FFFFFF" strokeWidth={2.5} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 7. FREQUENCY */}
              <div>
                <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-2">
                  FREQUENCY
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCIES.map((f) => {
                    const selected = frequency === f.key
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFrequency(f.key)}
                        className="min-h-[44px] rounded-[12px] border text-[13px] transition-colors"
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
                  <div className="flex justify-between gap-1.5 mt-3">
                    {WEEKDAY_BUTTONS.map(({ day, label }) => {
                      const active = customDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleCustomDay(day)}
                          className="flex-1 min-h-[44px] rounded-[12px] border text-xs font-bold transition-colors"
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
              </div>
            </div>

            {/* Footer Save Button */}
            <div className="px-5 py-3 border-t border-border bg-surface flex-shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full min-h-[52px] rounded-[14px] font-bold text-base transition-colors active:scale-[0.98]"
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

