import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  Check,
  CheckSquare,
  Flame,
  TrendingUp,
  Trophy,
  Sparkles,
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
  tasksTotal?: number
  habitsDone: number
  habitsScheduled?: number
  completionPercent: number
  isLevelUpMode?: boolean
}

const MOTIVATIONAL_QUOTES = [
  'Relentless consistency builds empires. Keep the fire burning today!',
  'You showed up today. That is how champions separate themselves from the crowd.',
  'Momentum is your superpower. Do not break the chain!',
  'Another day, another victory forged in daily execution.',
]

export default function DailyStreakModal({
  isOpen,
  onClose,
  currentStreak,
  bestStreak,
  tasksDone,
  habitsDone,
  completionPercent,
  isLevelUpMode = false,
}: DailyStreakModalProps) {
  const todayStr = getTodayLocal()
  const [displayedStreak, setDisplayedStreak] = useState(
    isLevelUpMode && currentStreak > 1 ? currentStreak - 1 : currentStreak
  )

  // Smooth streak count-up animation when leveling up on next day
  useEffect(() => {
    if (!isOpen) return
    if (isLevelUpMode && currentStreak > 1) {
      setDisplayedStreak(currentStreak - 1)
      const timer = setTimeout(() => {
        setDisplayedStreak(currentStreak)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setDisplayedStreak(currentStreak)
    }
  }, [isOpen, isLevelUpMode, currentStreak])

  const motivationalQuote = useMemo(() => {
    const idx = Math.abs(currentStreak) % MOTIVATIONAL_QUOTES.length
    return MOTIVATIONAL_QUOTES[idx]
  }, [currentStreak])

  // Generate 7-day strip (Sun -> Sat) around current week
  const weekDays = useMemo(() => {
    const today = parseLocalDate(todayStr)
    const sunday = startOfWeek(today, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(sunday, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const isToday = dateStr === todayStr
      const inFuture = isFuture(dateStr)
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
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#070709] text-white overflow-hidden select-none"
          style={{
            height: '100dvh',
            maxHeight: '100dvh',
            paddingTop: 'max(env(safe-area-inset-top), 12px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          }}
        >
          {/* Top Bar: < Home */}
          <div className="flex items-center px-4 py-1 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#F5F5F7] active:opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5 text-[#F5F5F7]" />
              <span>Home</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-between px-4 max-w-[420px] mx-auto w-full py-1 overflow-hidden min-h-0">
            {/* Center Flame & Streak Info */}
            <div className="flex flex-col items-center text-center my-auto flex-shrink-0">
              <RealisticBurningFlame size={105} />

              <motion.h1
                key={displayedStreak}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-2 text-[44px] font-black tracking-tight leading-none text-white"
              >
                {displayedStreak}
              </motion.h1>

              <p className="mt-0.5 text-[16px] font-bold text-white tracking-wide">
                days streak
              </p>

              <p className="mt-1 text-[12px] text-[#A1A1AA] max-w-[290px] leading-snug">
                {isLevelUpMode ? motivationalQuote : 'Keep mining daily to increase your consistency and momentum.'}
              </p>
            </div>

            {/* Weekdays Row (Sun -> Sat) */}
            <div className="w-full rounded-[20px] border border-[#242428] bg-[#161618] p-2.5 my-1.5 flex-shrink-0">
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((d) => (
                  <div key={d.dateStr} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium text-[#8E8E93]">
                      {d.label}
                    </span>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                        d.isToday
                          ? 'bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/40 ring-2 ring-[#FF6A00]/40'
                          : d.isChecked
                            ? 'bg-[#FF6A00]/25 text-[#FF6A00] border border-[#FF6A00]/60'
                            : 'bg-[#0D0D0E] text-[#636366] border border-[#242428]'
                      }`}
                    >
                      {d.isChecked || d.isToday ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#8E8E93]">
                          {d.dayNum}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STATUS Section - Clean Numbers Only (Hidden in Level-Up mode as requested) */}
            {!isLevelUpMode ? (
              <div className="w-full rounded-[20px] border border-[#242428] bg-[#161618] p-3 my-1.5 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
                    STATUS
                  </span>
                  <span className="text-[10px] font-semibold text-[#8E8E93]">
                    Today&apos;s Output
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Tasks Done */}
                  <div className="rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#30D158]">
                      <CheckSquare className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        TASKS DONE
                      </span>
                    </div>
                    <p className="mt-1 text-[16px] font-extrabold text-[#F5F5F7]">
                      {tasksDone} tasks done
                    </p>
                  </div>

                  {/* 2. Habits Completed */}
                  <div className="rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#FF6A00]">
                      <Flame className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        HABITS DONE
                      </span>
                    </div>
                    <p className="mt-1 text-[16px] font-extrabold text-[#F5F5F7]">
                      {habitsDone} habits done
                    </p>
                  </div>

                  {/* 3. % Progress */}
                  <div className="rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#0A84FF]">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        % PROGRESS
                      </span>
                    </div>
                    <p className="mt-1 text-[16px] font-extrabold text-[#F5F5F7]">
                      {completionPercent}% completed
                    </p>
                  </div>

                  {/* 4. Best Streak */}
                  <div className="rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#FF9F0A]">
                      <Trophy className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        BEST RECORD
                      </span>
                    </div>
                    <p className="mt-1 text-[16px] font-extrabold text-[#F5F5F7]">
                      {Math.max(bestStreak, currentStreak)} days best
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full rounded-[20px] border border-[#FF6A00]/40 bg-[#161618] p-4 my-2 text-center flex-shrink-0">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6A00]/20 text-[#FF6A00] mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-bold text-white">Streak Extended!</h3>
                <p className="text-[12px] text-[#A1A1AA] mt-1 leading-relaxed">
                  {motivationalQuote}
                </p>
              </div>
            )}

            {/* Bottom Continue Button - Always Fully Visible Without Scrolling */}
            <div className="w-full pt-1 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[48px] rounded-[16px] bg-[#FF6A00] text-[15px] font-bold text-white shadow-lg shadow-[#FF6A00]/25 active:scale-[0.98] transition-all"
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
