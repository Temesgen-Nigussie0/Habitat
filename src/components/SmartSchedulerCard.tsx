import { useEffect, useState } from 'react'
import { AlarmClock, BellRing, Check, Flame, Shield, Sparkles } from 'lucide-react'
import type { SmartHabitSuggestion } from '../lib/analytics'

interface SmartSchedulerCardProps {
  suggestions: SmartHabitSuggestion[]
  enabled: boolean
  onSaveSchedule: (enabled: boolean, timesMap: Record<number, string>) => Promise<void>
  onTriggerTestToast: (message: string) => void
  habitsCount: number
}

export default function SmartSchedulerCard({
  suggestions,
  enabled,
  onSaveSchedule,
  onTriggerTestToast,
  habitsCount,
}: SmartSchedulerCardProps) {
  const [isActive, setIsActive] = useState(enabled)
  const [timesMap, setTimesMap] = useState<Record<number, string>>({})
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    setIsActive(enabled)
  }, [enabled])

  useEffect(() => {
    const initial: Record<number, string> = {}
    for (const s of suggestions) {
      initial[s.habitId] = s.time24
    }
    setTimesMap(initial)
  }, [suggestions])

  const handleToggle = async () => {
    const next = !isActive
    setIsActive(next)
    setSavedFeedback(false)
    await onSaveSchedule(next, timesMap)
  }

  const handleTimeChange = (habitId: number, value: string) => {
    setSavedFeedback(false)
    setTimesMap((prev) => ({ ...prev, [habitId]: value }))
  }

  const handleSync = async () => {
    await onSaveSchedule(isActive, timesMap)
    setSavedFeedback(true)
  }

  return (
    <div className="rounded-[22px] border border-[#242428] bg-[#161618] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0D0D0E]">
            <Sparkles className="h-[18px] w-[18px] text-[#FF6A00]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
              SMART HABIT SCHEDULER
            </p>
            <h2 className="text-[15px] font-bold text-[#F5F5F7]">
              Pattern-Based Prompts
            </h2>
          </div>
        </div>

        {/* Orange Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label="Toggle Smart Habit Scheduler"
          onClick={handleToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            isActive ? 'bg-[#FF6A00]' : 'bg-[#2C2C30]'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
              isActive ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      <p className="mt-2.5 text-[12px] leading-[17px] text-[#A1A1AA]">
        Based on your activity patterns, these trigger times minimize cognitive
        resistance and maximize completion momentum:
      </p>

      {/* Per-Habit Rows */}
      <div className="mt-3.5 flex flex-col gap-2">
        {suggestions.length === 0 ? (
          <p className="rounded-[14px] bg-[#0D0D0E] px-3 py-3 text-[12px] text-[#8E8E93]">
            Add habits on the Today tab to customize smart reminder times.
          </p>
        ) : (
          suggestions.map((item) => (
            <div
              key={item.habitId}
              className="flex items-center justify-between gap-2 rounded-[14px] bg-[#0D0D0E] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#F5F5F7]">
                  {item.habitName}
                </p>
                <p className="text-[11px] text-[#8E8E93]">{item.reason}</p>
              </div>

              <label className="relative flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1 rounded-[8px] border border-[#FF6A00]/40 bg-[#241508] px-2 py-1 text-[11px] font-bold text-[#FF6A00]">
                <AlarmClock className="h-3 w-3 shrink-0" />
                <input
                  type="time"
                  value={timesMap[item.habitId] || item.time24}
                  onChange={(e) => handleTimeChange(item.habitId, e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-[82px] bg-transparent text-[11px] font-bold text-[#FF6A00] focus:outline-none"
                />
              </label>
            </div>
          ))
        )}
      </div>

      {/* Sync Smart Reminders Button */}
      <button
        type="button"
        disabled={!isActive}
        onClick={handleSync}
        className={`mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold text-white transition-opacity active:scale-[0.99] ${
          isActive ? 'bg-[#FF6A00]' : 'cursor-not-allowed bg-[#242428] text-[#8E8E93]'
        }`}
      >
        {savedFeedback ? (
          <>
            <Check className="h-4 w-4" />
            Schedule saved ✓
          </>
        ) : (
          <>
            <BellRing className="h-4 w-4" />
            Sync Smart Reminders
          </>
        )}
      </button>

      {savedFeedback && (
        <p className="mt-1.5 text-center text-[11px] text-[#8E8E93]">
          Phone notifications are coming in a later update.
        </p>
      )}

      {/* Push Notification Test Lab */}
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.8px] text-[#FF6A00]">
        PUSH NOTIFICATION TEST LAB
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            onTriggerTestToast(
              '🔥 TASK BURNING: Urgent Priority — “Client 4K Video Color Grading” is about to expire! (Expiring in 45m)'
            )
          }
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] border border-[#FF9F0A]/70 text-[11px] font-bold text-[#FF9F0A] active:scale-95"
        >
          <Flame className="h-3.5 w-3.5" />
          Task Alert
        </button>

        <button
          type="button"
          onClick={() => {
            const count = Math.max(2, habitsCount)
            onTriggerTestToast(
              `🛡️ STREAK GUARD: ${count} habits remaining — Don't let your 14-day streak die tonight! Tap to log.`
            )
          }}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] border border-[#FF6A00]/70 text-[11px] font-bold text-[#FF6A00] active:scale-95"
        >
          <Shield className="h-3.5 w-3.5" />
          Habit Guard
        </button>
      </div>
    </div>
  )
}

