import { useState, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Droplets, Flame, Lock, Plus, Info } from 'lucide-react'
import type { Habit, HabitEntry } from '../db/types'
import { HabitIcon } from '../lib/habitIcons'
import ProgressRing from './ProgressRing'

interface HabitCardProps {
  habit: Habit
  entry?: HabitEntry
  isLocked: boolean
  onToggle: () => void
  onIncrement: () => void
  onOpenDetail: () => void
  onLockedClick: () => void
}

export default function HabitCard({
  habit,
  entry,
  isLocked,
  onToggle,
  onIncrement,
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
        else onToggle()
      } else if (finalX <= -60) {
        onOpenDetail()
      }
    } else if (!p.moved) {
      onOpenDetail()
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
        className="relative rounded-[20px] border p-4 select-none"
        style={{
          touchAction: 'pan-y',
          backgroundColor: '#1B1B24',
          borderColor: isCompleted ? 'rgba(255,106,0,0.45)' : '#22222E',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Colored Icon Chip */}
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: habit.colorHex + '22',
              borderColor: habit.colorHex + '44',
            }}
          >
            <HabitIcon iconName={habit.iconName} color={habit.colorHex} size={24} />
          </div>

          {/* Middle Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-text-primary truncate">{habit.name}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-elevated text-text-secondary border border-border">
                {habit.category}
              </span>

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

