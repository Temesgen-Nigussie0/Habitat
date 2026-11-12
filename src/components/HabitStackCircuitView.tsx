import { Check, Lock, Zap, Flame } from 'lucide-react'
import type { Habit, HabitEntry } from '../db/types'
import { HabitIcon } from '../lib/habitIcons'

interface HabitStackCircuitViewProps {
  habits: Habit[]
  entryMap: Map<number, HabitEntry>
  isLocked: boolean
  onToggleHabit: (habit: Habit) => void
  onOpenDetail: (habit: Habit) => void
  onLockedClick: () => void
}

const TIME_ORDER: Record<string, number> = {
  Morning: 0,
  Afternoon: 1,
  Evening: 2,
  Anytime: 3,
}

export default function HabitStackCircuitView({
  habits,
  entryMap,
  isLocked,
  onToggleHabit,
  onOpenDetail,
  onLockedClick,
}: HabitStackCircuitViewProps) {
  const ordered = [...habits].sort((a, b) => {
    const oa = TIME_ORDER[a.timeOfDay] ?? 3
    const ob = TIME_ORDER[b.timeOfDay] ?? 3
    return oa - ob
  })

  const completedCount = ordered.filter((h) => entryMap.get(h.id!)?.isCompleted).length

  if (ordered.length === 0) {
    return (
      <div className="rounded-[20px] bg-elevated border border-border p-8 text-center">
        <p className="text-4xl mb-3">🌱</p>
        <p className="text-text-primary font-semibold text-base">No habits for this day</p>
        <p className="text-text-secondary text-xs mt-1">
          Tap the + button to create a new habit.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Circuit Momentum Header */}
      <div className="rounded-[16px] bg-elevated border border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange" />
          <span className="text-orange text-[11px] font-bold tracking-[0.08em] uppercase">
            CIRCUIT MOMENTUM
          </span>
        </div>
        <span
          className="text-[11px] font-extrabold"
          style={{
            color: completedCount === ordered.length ? '#30D158' : '#FF9F0A',
          }}
        >
          {completedCount} / {ordered.length} NODES POWERED
        </span>
      </div>

      {/* Connected Nodes */}
      <div>
        {ordered.map((habit, index) => {
          const entry = entryMap.get(habit.id!)
          const isCompleted = entry?.isCompleted === true
          const prevCompleted =
            index === 0 || entryMap.get(ordered[index - 1].id!)?.isCompleted === true
          const isNextInChain = !isLocked && !isCompleted && prevCompleted
          const isLast = index === ordered.length - 1

          return (
            <div key={habit.id} className="flex items-stretch gap-3">
              {/* Left Node + Wire */}
              <div className="flex flex-col items-center w-9 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) onLockedClick()
                    else onToggleHabit(habit)
                  }}
                  aria-label={`Circuit node ${habit.name}`}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-3"
                  style={{
                    backgroundColor: isLocked
                      ? '#14141A'
                      : isCompleted
                        ? '#30D158'
                        : isNextInChain
                          ? '#FF6A00'
                          : '#1B1B24',
                    borderColor: isLocked
                      ? '#22222E'
                      : isCompleted
                        ? '#30D158'
                        : isNextInChain
                          ? '#FF7A1A'
                          : '#323242',
                  }}
                >
                  {isLocked ? (
                    <Lock size={13} className="text-text-tertiary" />
                  ) : isCompleted ? (
                    <Check size={15} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isNextInChain ? '#FFFFFF' : '#6E6E7A' }}
                    >
                      {index + 1}
                    </span>
                  )}
                </button>

                {!isLast && (
                  <div
                    className="w-0.5 flex-1 min-h-[20px] my-1 rounded-full"
                    style={{
                      backgroundColor: isCompleted ? '#FF6A00' : '#22222E',
                    }}
                  />
                )}
              </div>

              {/* Right Card */}
              <button
                type="button"
                onClick={() => onOpenDetail(habit)}
                className="flex-1 text-left rounded-[18px] border p-3.5 mb-3 flex items-center gap-3 transition-colors active:scale-[0.99]"
                style={{
                  backgroundColor: isCompleted
                    ? 'rgba(255,106,0,0.10)'
                    : isNextInChain
                      ? '#14141A'
                      : '#1B1B24',
                  borderColor: isCompleted
                    ? 'rgba(48,209,88,0.45)'
                    : isNextInChain
                      ? '#FF6A00'
                      : '#22222E',
                }}
              >
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 border"
                  style={{
                    backgroundColor: habit.colorHex + '22',
                    borderColor: habit.colorHex + '44',
                  }}
                >
                  <HabitIcon iconName={habit.iconName} color={habit.colorHex} size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{habit.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-tertiary">{habit.timeOfDay}</span>
                    {habit.targetCount > 1 && (
                      <span className="text-[11px] font-semibold text-orange">
                        {entry?.currentCount ?? 0}/{habit.targetCount} {habit.unit}
                      </span>
                    )}
                    {habit.currentStreak > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber">
                        <Flame size={11} fill="#FF9F0A" />
                        {habit.currentStreak}d
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

