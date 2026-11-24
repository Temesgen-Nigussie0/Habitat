import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Lock,
  Pause,
  Play,
  Plus,
  Info,
} from 'lucide-react'
import type { Habit, HabitEntry } from '../db/types'
import { HabitIcon } from '../lib/habitIcons'
import { formatHabitFrequency } from '../lib/streak'
import { formatTimerSubtitle, type HabitTimerSnapshot } from '../lib/habitTimer'
import ProgressRing from './ProgressRing'

interface HabitCardProps {
  habit: Habit
  entry?: HabitEntry
  isLocked: boolean
  timerSnapshot?: HabitTimerSnapshot
  onToggle: () => void
  onIncrement: () => void
  onToggleTimer?: () => void
  onOpenTimer?: () => void
  onOpenDetail: () => void
  onLockedClick: () => void
}

export default function HabitCard({
  habit,
  entry,
  isLocked,
  timerSnapshot,
  onToggle,
  onIncrement,
  onToggleTimer,
  onOpenTimer,
  onOpenDetail,
  onLockedClick,
}: HabitCardProps) {
  const [waterExpanded, setWaterExpanded] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const pointerRef = useRef<{
    active: boolean
    startX: number
    startY: number
    horizontal: boolean | null
    moved: boolean
  }>({ active: false, startX: 0, startY: 0, horizontal: null, moved: false })

  const isCompleted = entry?.isCompleted === true
  const currentCount = entry?.currentCount ?? 0
  const targetCount = Math.max(1, habit.targetCount)
  const isTimedHabit = Boolean(habit.hasTimer && (habit.timerMinutes ?? 0) > 0)
  const isTimerActive = Boolean(isTimedHabit && !isLocked && !isCompleted && timerSnapshot?.hasStarted)
  const timerProgress = isTimerActive ? timerSnapshot?.progress ?? 0 : 0
  const isTimerRunning = Boolean(isTimerActive && timerSnapshot?.isRunning)
  const isWaterHabit =
    habit.iconName.toLowerCase() === 'water' ||
    habit.name.toLowerCase().includes('water')

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore if pointer starts on an interactive button inside the card
    if ((e.target as HTMLElement).closest('button')) return
    pointerRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      horizontal: null,
      moved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = pointerRef.current
    if (!p.active) return
    const dx = e.clientX - p.startX
    const dy = e.clientY - p.startY

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      p.moved = true
    }

    if (p.horizontal === null) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        p.horizontal = true
        setIsSwiping(true)
      } else if (Math.abs(dy) > 10) {
        p.horizontal = false
        p.active = false
        return
      }
    }

    if (p.horizontal) {
      const clamped = Math.max(-110, Math.min(110, dx))
      setSwipeX(clamped)
    }
  }

  const finishPointer = (cancelled = false) => {
    const p = pointerRef.current
    if (!p.active) return
    p.active = false

    const finalX = swipeX
    setIsSwiping(false)
    setSwipeX(0)

    if (cancelled) return

    if (p.horizontal) {
      if (finalX >= 60) {
        if (isLocked) onLockedClick()
        else if (isTimedHabit && !isCompleted && onToggleTimer) onToggleTimer()
        else onToggle()
      } else if (finalX <= -60) {
        onOpenDetail()
      }
    } else if (!p.moved) {
      if (isTimerActive && onOpenTimer) {
        onOpenTimer()
      } else {
        onOpenDetail()
      }
    }
  }

  const progressRatio = Math.min(1, currentCount / targetCount)
  const waterRatio = Math.min(1, currentCount / targetCount)

  return (
    <div className="relative rounded-[20px] overflow-hidden">
      {/* Swipe revealed background */}
      {swipeX !== 0 && (
        <div
          className="absolute inset-0 flex items-center px-5 rounded-[20px]"
          style={{
            backgroundColor:
              swipeX > 0 ? 'rgba(48,209,88,0.85)' : 'rgba(255,159,10,0.85)',
            justifyContent: swipeX > 0 ? 'flex-start' : 'flex-end',
          }}
          aria-hidden
        >
          {swipeX > 0 ? (
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Check size={18} strokeWidth={2.5} />
              <span>{isCompleted ? 'Undo' : 'Mark Done'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <span>Details</span>
              <Info size={18} />
            </div>
          )}
        </div>
      )}

      {/* Foreground Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => finishPointer(false)}
        onPointerCancel={() => finishPointer(true)}
        className="relative rounded-[20px] border p-4 select-none overflow-hidden"
        style={{
          WebkitTouchCallout: 'none',
          touchAction: 'pan-y',
          backgroundColor: '#1B1B24',
          borderColor: isTimerRunning
            ? 'rgba(255,106,0,0.75)'
            : isCompleted || isTimerActive
              ? 'rgba(255,106,0,0.45)'
              : '#22222E',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Live In-Card Loading Progress Fill for Timed Habits (Image 2 Style) */}
        {isTimerActive && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 pointer-events-none"
            style={{
              width: `${Math.min(100, Math.max(2, timerProgress * 100))}%`,
              background:
                'linear-gradient(90deg, rgba(255,106,0,0.38) 0%, rgba(255,132,0,0.28) 82%, rgba(255,159,10,0.44) 100%)',
              borderRight:
                timerProgress < 0.995
                  ? '2px solid rgba(255,159,10,0.75)'
                  : 'none',
              transition: 'width 260ms linear',
            }}
          />
        )}

        {/* 8-Partition Ocean Water Wave Fill for Drink Water Habits */}
        {isWaterHabit && targetCount > 1 && !isLocked && (
          <>
            {/* 8 Equal Partition Dividers */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${targetCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: targetCount }, (_, idx) => (
                <div
                  key={idx}
                  className="h-full border-r last:border-r-0"
                  style={{
                    borderColor:
                      idx < currentCount
                        ? 'rgba(125,211,252,0.22)'
                        : 'rgba(255,255,255,0.04)',
                  }}
                />
              ))}
            </div>

            {/* Rolling Ocean Wave Fill from Left */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 overflow-visible"
              style={{
                width: `${Math.min(100, Math.max(0, waterRatio * 100))}%`,
                background:
                  'linear-gradient(90deg, rgba(14,165,233,0.24) 0%, rgba(56,189,248,0.36) 75%, rgba(125,211,252,0.48) 100%)',
                transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {currentCount > 0 && currentCount < targetCount && (
                <motion.svg
                  viewBox="0 0 18 100"
                  preserveAspectRatio="none"
                  className="absolute -right-[10px] -top-3 h-[calc(100%+24px)] w-[18px]"
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                >
                  <path
                    d="M0,0 C9,14 2,28 8,42 C14,56 3,72 9,86 C13,94 6,100 0,100 L0,0 Z"
                    fill="rgba(125,211,252,0.55)"
                  />
                </motion.svg>
              )}
            </div>
          </>
        )}

        <div className="relative z-10 flex items-center gap-3">
          {/* Orange Icon Chip */}
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: isTimerActive
                ? 'rgba(255,106,0,0.24)'
                : 'rgba(255,106,0,0.14)',
              borderColor: isTimerActive
                ? 'rgba(255,159,10,0.55)'
                : 'rgba(255,106,0,0.3)',
            }}
          >
            <HabitIcon iconName={habit.iconName} color="#FF6A00" size={24} />
          </div>

          {/* Middle Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold truncate">
              <span
                className={`relative inline-block max-w-full align-bottom truncate transition-colors duration-300 ${
                  isCompleted ? 'text-text-secondary opacity-80' : 'text-text-primary'
                }`}
              >
                {habit.name}
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ scaleX: isCompleted ? 1 : 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'left center' }}
                  className="pointer-events-none absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[#FF6A00]"
                />
              </span>
            </p>

            {/* Timed habit progress subtitle (like Image 2) */}
            {isTimedHabit && timerSnapshot && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {isTimerRunning && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9F0A] animate-pulse flex-shrink-0" />
                )}
                <p className="text-[12px] font-medium text-text-secondary truncate tabular-nums">
                  {formatHabitFrequency(habit)}, {formatTimerSubtitle(timerSnapshot)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-elevated/90 text-text-secondary border border-border">
                {habit.category}
              </span>

              {!isTimedHabit && habit.frequency !== 'DAILY' && (
                <span className="text-[11px] font-medium text-orange/90">
                  • {formatHabitFrequency(habit)}
                </span>
              )}

              {habit.timeOfDay !== 'Anytime' && (
                <span className="text-[11px] text-text-tertiary">• {habit.timeOfDay}</span>
              )}

              {habit.currentStreak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber">
                  <Flame size={12} className="text-amber" fill="#FF9F0A" />
                  {habit.currentStreak}d
                </span>
              )}

              {isWaterHabit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setWaterExpanded((v) => !v)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                  style={{
                    backgroundColor: 'rgba(10,132,255,0.16)',
                    color: '#0A84FF',
                  }}
                >
                  {waterExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>Hydro</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Action Circle (44px+ tap target) */}
          {isLocked ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLockedClick()
              }}
              aria-label="Date locked"
              className="w-11 h-11 rounded-full bg-elevated border border-border flex items-center justify-center flex-shrink-0"
            >
              <Lock size={16} className="text-text-tertiary" />
            </button>
          ) : isTimedHabit ? (
            isCompleted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                aria-label={`Undo ${habit.name}`}
                className="w-11 h-11 rounded-full bg-orange flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              >
                <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleTimer?.()
                }}
                aria-label={isTimerRunning ? `Pause ${habit.name}` : `Start ${habit.name} timer`}
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              >
                <ProgressRing
                  value={timerProgress}
                  size={46}
                  strokeWidth={3.5}
                  color="#FF6A00"
                  trackColor="rgba(255,106,0,0.22)"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isTimerRunning ? '#FF6A00' : '#14141A',
                    }}
                  >
                    {isTimerRunning ? (
                      <Pause size={16} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" className="ml-0.5" />
                    )}
                  </div>
                </ProgressRing>
              </button>
            )
          ) : targetCount > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              aria-label={`Log ${habit.name}`}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            >
              {isCompleted ? (
                <div className="w-11 h-11 rounded-full bg-orange flex items-center justify-center">
                  <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
                </div>
              ) : (
                <ProgressRing value={progressRatio} size={44} strokeWidth={3}>
                  <span className="text-[11px] font-bold text-orange">
                    {currentCount}/{targetCount}
                  </span>
                </ProgressRing>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              aria-label={`Toggle ${habit.name}`}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
              style={{
                backgroundColor: isCompleted ? '#FF6A00' : 'transparent',
                borderColor: isCompleted ? '#FF6A00' : '#323242',
              }}
            >
              {isCompleted && <Check size={20} color="#FFFFFF" strokeWidth={2.5} />}
            </button>
          )}
        </div>

        {/* Expanded Hydration Wave Drawer */}
        {isWaterHabit && waterExpanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3.5 rounded-[16px] bg-elevated border p-3.5"
            style={{ borderColor: 'rgba(10,132,255,0.32)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Droplets size={16} color="#0A84FF" />
                <span className="text-sm font-bold text-text-primary">Hydration Wave</span>
              </div>
              <span className="text-xs font-semibold text-blue">
                {currentCount * 250}ml / {targetCount * 250}ml
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-surface overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-blue transition-all duration-300"
                style={{ width: `${waterRatio * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-1 mb-3">
              {Array.from({ length: Math.min(8, targetCount) }, (_, idx) => {
                const filled = idx + 1 <= currentCount
                return (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded-full border flex items-center justify-center"
                    style={{
                      backgroundColor: filled ? '#0A84FF' : '#14141A',
                      borderColor: filled ? '#0A84FF' : '#22222E',
                    }}
                  >
                    <Droplets size={12} color={filled ? '#FFFFFF' : '#6E6E7A'} />
                  </div>
                )
              })}
            </div>

            {!isLocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onIncrement()
                }}
                className="w-full min-h-[44px] rounded-[12px] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(90deg, #0A84FF, #00B4D8)',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+1 Glass (250ml)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

