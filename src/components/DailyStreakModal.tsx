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
  activeDates?: Set<string>
  freezeDates?: Set<string>
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
  activeDates,
  freezeDates,
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
      const isChecked = activeDates
        ? activeDates.has(dateStr) || Boolean(freezeDates?.has(dateStr))
        : isToday && currentStreak > 0
      return {
        dateStr,
        label: format(d, 'EEE'),
        dayNum: format(d, 'd'),
        isToday,
        isFuture: inFuture,
        isChecked: !inFuture && isChecked,
      }
    })
  }, [todayStr, currentStreak, activeDates, freezeDates])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col justify-between md:items-center md:justify-center bg-[#070709] md:bg-[#050507]/92 md:backdrop-blur-md text-white overflow-hidden select-none md:p-6"
          style={{
            height: '100dvh',
            maxHeight: '100dvh',
            paddingTop: 'max(env(safe-area-inset-top), 12px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          }}
        >
          {/* Ambient Atmospheric Spotlight */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 overflow-hidden"
          >
            <div
              className="absolute left-1/2 top-[28%] md:top-[42%] -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-75"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,106,0,0.22) 0%, rgba(255,140,0,0.08) 42%, transparent 72%)',
              }}
            />
          </div>

          {/* Mobile Top Bar: < Home */}
          <div className="relative z-10 flex md:hidden items-center px-4 py-1 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#F5F5F7] active:opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5 text-[#F5F5F7]" />
              <span>Home</span>
            </button>
          </div>

          <div className="relative z-10 flex-1 md:flex-none flex flex-col items-center justify-between px-4 max-w-[420px] md:max-w-[460px] mx-auto w-full py-1 md:p-6 md:rounded-[32px] md:border md:border-[#2C2C36] md:bg-[#0D0D12]/90 md:backdrop-blur-2xl md:shadow-[0_24px_80px_rgba(255,106,0,0.18)] overflow-hidden min-h-0">
            {/* Desktop Card Top Bar */}
            <div className="hidden md:flex w-full items-center justify-between mb-2 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#24242E] bg-[#16161B] px-3 py-1.5 text-[12px] font-semibold text-[#F5F5F7] hover:border-[#FF6A00]/45 hover:bg-[#1C1C24] transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-[#F5F5F7]" />
                <span>Home</span>
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF8A33]">
                <Flame className="h-3 w-3 text-[#FF6A00]" />
                {isLevelUpMode ? 'Streak Extended' : 'Daily Momentum'}
              </span>
            </div>

            {/* Center Flame & Streak Info */}
            <div className="relative flex flex-col items-center text-center my-auto flex-shrink-0 md:py-2">
              <div
                aria-hidden
                className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,106,0,0.34) 0%, rgba(255,159,10,0.08) 55%, transparent 75%)',
                }}
              />
              <div className="relative">
                <RealisticBurningFlame size={105} />
              </div>

              <motion.h1
                key={displayedStreak}
                layoutId={!isLevelUpMode ? 'streak-morph-badge' : undefined}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative mt-2 text-[44px] font-black tracking-tight leading-none text-white tabular-nums"
              >
                {displayedStreak}
              </motion.h1>

              <p className="relative mt-0.5 text-[16px] font-bold text-white tracking-wide">
                {displayedStreak === 1 ? 'day streak' : 'days streak'}
              </p>

              <p className="relative mt-1 text-[12px] text-[#A1A1AA] max-w-[300px] leading-snug">
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
                      {d.isChecked ? (
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
                      {tasksDone} {tasksDone === 1 ? 'task' : 'tasks'} done
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
                      {habitsDone} {habitsDone === 1 ? 'habit' : 'habits'} done
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
                      {Math.max(bestStreak, currentStreak)}{' '}
                      {Math.max(bestStreak, currentStreak) === 1 ? 'day' : 'days'} best
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
            <div className="w-full pt-1 md:pt-2 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[48px] rounded-[16px] bg-gradient-to-r from-[#FF6A00] to-[#FF8A00] hover:brightness-110 text-[15px] font-bold text-white shadow-lg shadow-[#FF6A00]/30 active:scale-[0.98] transition-all"
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
