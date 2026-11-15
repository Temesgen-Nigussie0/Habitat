import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  Check,
  CheckSquare,
  Flame,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import RealisticBurningFlame from './RealisticBurningFlame'
import { getTodayLocal, parseLocalDate } from '../lib/streak'
import { isFuture } from '../lib/stats'

interface DailyStreakModalProps {
  isOpen: boolean
  onClose: () => void
  currentStreak: number
  bestStreak: number
  tasksDone: number
  tasksTotal: number
  habitsDone: number
  habitsScheduled: number
  completionPercent: number
}

export default function DailyStreakModal({
  isOpen,
  onClose,
  currentStreak,
  bestStreak,
  tasksDone,
  tasksTotal,
  habitsDone,
  habitsScheduled,
  completionPercent,
}: DailyStreakModalProps) {
  const todayStr = getTodayLocal()

  // Generate 7-day strip (Sun -> Sat) around current week
  const weekDays = useMemo(() => {
    const today = parseLocalDate(todayStr)
    const sunday = startOfWeek(today, { weekStartsOn: 0 }) // Sunday first
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(sunday, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const isToday = dateStr === todayStr
      const inFuture = isFuture(dateStr)
      // If completed or part of streak
      const isPastOrToday = !inFuture
      return {
        dateStr,
        label: format(d, 'EEE'),
        dayNum: format(d, 'd'),
        isToday,
        isFuture: inFuture,
        isChecked: isPastOrToday && currentStreak > 0,
      }
    })
  }, [todayStr, currentStreak])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#070709] text-white overflow-y-auto scrollbar-hidden"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          }}
        >
          {/* Top Bar: < Home */}
          <div className="flex items-center px-5 py-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#F5F5F7] active:opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5 text-[#F5F5F7]" />
              <span>Home</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-between px-5 max-w-[430px] mx-auto w-full py-4 space-y-6">
            {/* Center Flame & Streak Info */}
            <div className="flex flex-col items-center text-center mt-2">
              <RealisticBurningFlame size={150} />

              <h1 className="mt-4 text-[48px] font-black tracking-tight leading-none text-white">
                {currentStreak}
              </h1>
              <p className="mt-1 text-[18px] font-bold text-white tracking-wide">
                days streak
              </p>
              <p className="mt-2 text-[13px] text-[#A1A1AA] max-w-[280px] leading-relaxed">
                Keep mining daily to increase your consistency and momentum.
              </p>
            </div>

            {/* Weekdays Row (Sun -> Sat) */}
            <div className="w-full rounded-[22px] border border-[#242428] bg-[#161618] p-3.5">
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((d) => (
                  <div key={d.dateStr} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-medium text-[#8E8E93]">
                      {d.label}
                    </span>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                        d.isToday
                          ? 'bg-[#FF6A00] text-white shadow-lg shadow-[#FF6A00]/40 ring-2 ring-[#FF6A00]/30'
                          : d.isChecked
                            ? 'bg-[#FF6A00]/25 text-[#FF6A00] border border-[#FF6A00]/60'
                            : 'bg-[#0D0D0E] text-[#636366] border border-[#242428]'
                      }`}
                    >
                      {d.isChecked || d.isToday ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <span className="text-[12px] font-semibold text-[#8E8E93]">
                          {d.dayNum}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STATUS Section with 4 Cards (Replacing NEXT REWARD) */}
            <div className="w-full rounded-[24px] border border-[#242428] bg-[#161618] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
                  STATUS
                </span>
                <span className="text-[11px] font-semibold text-[#8E8E93]">
                  Today&apos;s Output
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Tasks Done */}
                <div className="rounded-[16px] border border-[#242428] bg-[#0D0D0E] p-3">
                  <div className="flex items-center gap-1.5 text-[#30D158]">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                      TASKS DONE
                    </span>
                  </div>
                  <p className="mt-1.5 text-[18px] font-extrabold text-[#F5F5F7]">
                    {tasksDone} / {tasksTotal}
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">Completed</p>
                </div>

                {/* 2. Habits Completed */}
                <div className="rounded-[16px] border border-[#242428] bg-[#0D0D0E] p-3">
                  <div className="flex items-center gap-1.5 text-[#FF6A00]">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                      HABITS DONE
                    </span>
                  </div>
                  <p className="mt-1.5 text-[18px] font-extrabold text-[#F5F5F7]">
                    {habitsDone} / {habitsScheduled}
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">Logged today</p>
                </div>

                {/* 3. % Progress */}
                <div className="rounded-[16px] border border-[#242428] bg-[#0D0D0E] p-3">
                  <div className="flex items-center gap-1.5 text-[#0A84FF]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                      % PROGRESS
                    </span>
                  </div>
                  <p className="mt-1.5 text-[18px] font-extrabold text-[#F5F5F7]">
                    {completionPercent}%
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">Day completion</p>
                </div>

                {/* 4. Best Streak */}
                <div className="rounded-[16px] border border-[#242428] bg-[#0D0D0E] p-3">
                  <div className="flex items-center gap-1.5 text-[#FF9F0A]">
                    <Trophy className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                      BEST RECORD
                    </span>
                  </div>
                  <p className="mt-1.5 text-[18px] font-extrabold text-[#F5F5F7]">
                    {Math.max(bestStreak, currentStreak)}d
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">All-time peak</p>
                </div>
              </div>
            </div>

            {/* Bottom Continue Button */}
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[52px] rounded-[18px] bg-[#FF6A00] text-[16px] font-bold text-white shadow-xl shadow-[#FF6A00]/25 active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

