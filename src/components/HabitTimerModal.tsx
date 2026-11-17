import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  FastForward,
  Flame,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { Habit } from '../db/types'
import { useHabitTimers } from '../context/HabitTimerContext'
import { formatHabitFrequency } from '../lib/streak'
import { formatTimerClock, formatTimerSubtitle } from '../lib/habitTimer'
import { HabitIcon } from '../lib/habitIcons'

interface HabitTimerModalProps {
  habit: Habit | null
  onClose: () => void
  onOpenDetail: (habit: Habit) => void
}

export default function HabitTimerModal({
  habit,
  onClose,
  onOpenDetail,
}: HabitTimerModalProps) {
  const {
    getSnapshot,
    toggleTimer,
    adjustTime,
    resetTimer,
    abortTimer,
    finishTimer,
    soundMuted,
    toggleSoundMuted,
  } = useHabitTimers()

  // Precompute 60 radial tick marks for the circular dial
  const ticks = useMemo(() => {
    const cx = 130
    const cy = 130
    const outerR = 104
    return Array.from({ length: 60 }, (_, i) => {
      const isMajor = i % 5 === 0
      const innerR = isMajor ? 94 : 98
      const angle = (i * 6 - 90) * (Math.PI / 180)
      return {
        i,
        isMajor,
        x1: cx + Math.cos(angle) * innerR,
        y1: cy + Math.sin(angle) * innerR,
        x2: cx + Math.cos(angle) * outerR,
        y2: cy + Math.sin(angle) * outerR,
      }
    })
  }, [])

  if (!habit) {
    return <AnimatePresence />
  }

  const snapshot = getSnapshot(habit)
  const remainingFraction =
    snapshot.targetSeconds > 0
      ? Math.max(0, Math.min(1, snapshot.remainingSeconds / snapshot.targetSeconds))
      : 0

  const size = 260
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2 - 4
  const circumference = 2 * Math.PI * radius
  // Show remaining arc sweeping clockwise (like a classic countdown dial)
  const dashLength = circumference * (snapshot.hasStarted ? remainingFraction : 1)
  const frequencyLabel = formatHabitFrequency(habit)
  const progressSubtitle = formatTimerSubtitle(snapshot)

  const handleAbort = () => {
    if (habit.id !== undefined) {
      abortTimer(habit.id)
    }
    onClose()
  }

  const handleFinish = async () => {
    await finishTimer(habit)
    onClose()
  }

  return (
    <AnimatePresence>
      {habit && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[70] flex flex-col justify-between overflow-hidden select-none text-white"
          style={{
            height: '100dvh',
            maxHeight: '100dvh',
            background:
              'radial-gradient(circle at 50% 34%, rgba(255,106,0,0.22) 0%, rgba(16,12,10,0.96) 52%, #070709 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            paddingTop: 'max(env(safe-area-inset-top), 14px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 18px)',
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize timer"
              className="w-11 h-11 rounded-full border border-white/10 bg-white/8 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>

            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-1.5 py-1">
              <button
                type="button"
                onClick={toggleSoundMuted}
                aria-label={soundMuted ? 'Unmute completion chime' : 'Mute completion chime'}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 active:scale-95 transition-transform"
              >
                {soundMuted ? <VolumeX size={18} className="text-text-tertiary" /> : <Volume2 size={18} className="text-[#FF9F0A]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenDetail(habit)
                }}
                aria-label="Habit details"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 active:scale-95 transition-transform"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Title + Subtitle + Streak */}
          <div className="px-6 text-center flex-shrink-0">
            <div className="inline-flex items-center gap-2 justify-center">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center border"
                style={{
                  backgroundColor: 'rgba(255,106,0,0.18)',
                  borderColor: 'rgba(255,106,0,0.4)',
                }}
              >
                <HabitIcon iconName={habit.iconName} color="#FF6A00" size={16} />
              </div>
              <h1 className="text-[24px] font-bold tracking-tight text-white truncate max-w-[260px]">
                {habit.name}
              </h1>
            </div>

            <div className="mt-1.5 flex items-center justify-center gap-2.5 text-[13px] text-[#A1A1AA]">
              <span>
                {frequencyLabel}, {progressSubtitle}
              </span>
              {habit.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/35 px-2 py-0.5 text-[11px] font-bold text-[#FF9F0A]">
                  <Flame size={12} fill="#FF9F0A" className="text-[#FF9F0A]" />
                  {habit.currentStreak}
                </span>
              )}
            </div>
          </div>

          {/* Center Hero Countdown Dial */}
          <div className="flex-1 flex items-center justify-center my-auto min-h-0 px-4">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
              {/* Soft outer ambient glow */}
              <div
                className="absolute inset-4 rounded-full pointer-events-none transition-opacity duration-500"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,106,0,0.18) 0%, rgba(255,106,0,0.03) 62%, transparent 75%)',
                  opacity: snapshot.isRunning ? 1 : 0.45,
                }}
              />

              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
              >
                <defs>
                  <linearGradient id="habitatTimerArc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF9F0A" />
                    <stop offset="55%" stopColor="#FF6A00" />
                    <stop offset="100%" stopColor="#FF4500" />
                  </linearGradient>
                </defs>

                {/* Radial inner clock ticks */}
                {ticks.map((t) => (
                  <line
                    key={t.i}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.isMajor ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)'}
                    strokeWidth={t.isMajor ? 2 : 1.2}
                    strokeLinecap="round"
                  />
                ))}

                {/* Background ring track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,106,0,0.16)"
                  strokeWidth={strokeWidth}
                />

                {/* Active glowing orange countdown arc */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#habitatTimerArc)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${dashLength} ${circumference}`}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    transition: 'stroke-dasharray 240ms linear',
                    filter: 'drop-shadow(0 0 12px rgba(255,106,0,0.55))',
                  }}
                />
              </svg>

              {/* Center Digital Clock */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[52px] font-bold tracking-tight tabular-nums leading-none text-white">
                  {formatTimerClock(snapshot.remainingSeconds)}
                </span>
                <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      snapshot.isRunning
                        ? 'bg-[#FF6A00] animate-pulse'
                        : snapshot.hasStarted
                          ? 'bg-[#FF9F0A]'
                          : 'bg-[#6E6E7A]'
                    }`}
                  />
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/80">
                    {snapshot.isRunning ? 'Focusing' : snapshot.hasStarted ? 'Paused' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Stack (Image 3 layout in Habitat Orange theme) */}
          <div className="w-full max-w-[400px] mx-auto px-5 space-y-2.5 flex-shrink-0">
            {/* Row 1: -1 minute / +1 minute */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => adjustTime(habit, -1)}
                className="min-h-[48px] rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/12 text-[#FFB37B] text-[14px] font-semibold active:scale-[0.97] transition-all"
              >
                − 1 minute
              </button>
              <button
                type="button"
                onClick={() => adjustTime(habit, 1)}
                className="min-h-[48px] rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/12 text-[#FFB37B] text-[14px] font-semibold active:scale-[0.97] transition-all"
              >
                + 1 minute
              </button>
            </div>

            {/* Row 2: Finish | Abort | Reset | +5 minutes */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleFinish()}
                aria-label="Finish habit now"
                title="Finish now"
                className="flex flex-col items-center justify-center w-[58px] min-h-[50px] rounded-full border border-[#30D158]/35 bg-[#30D158]/14 text-[#30D158] active:scale-95 transition-all flex-shrink-0"
              >
                <FastForward size={16} />
                <span className="text-[9px] font-bold tracking-wide uppercase mt-0.5">
                  Finish
                </span>
              </button>

              <button
                type="button"
                onClick={handleAbort}
                aria-label="Abort timer session"
                title="Abort session"
                className="flex flex-col items-center justify-center w-[58px] min-h-[50px] rounded-full border border-[#FF453A]/35 bg-[#FF453A]/14 text-[#FF6961] active:scale-95 transition-all flex-shrink-0"
              >
                <X size={16} />
                <span className="text-[9px] font-bold tracking-wide uppercase mt-0.5">
                  Abort
                </span>
              </button>

              <button
                type="button"
                onClick={() => resetTimer(habit)}
                aria-label="Reset timer"
                title="Reset timer"
                className="flex flex-col items-center justify-center w-[58px] min-h-[50px] rounded-full border border-white/15 bg-white/8 text-white/80 active:scale-95 transition-all flex-shrink-0"
              >
                <RotateCcw size={15} />
                <span className="text-[9px] font-bold tracking-wide uppercase mt-0.5">
                  Reset
                </span>
              </button>

              <button
                type="button"
                onClick={() => adjustTime(habit, 5)}
                className="flex-1 min-h-[50px] rounded-full border border-[#FF6A00]/60 bg-[#FF6A00]/25 text-[#FF9F0A] text-[14px] font-bold active:scale-[0.97] transition-all"
              >
                + 5 minutes
              </button>
            </div>

            {/* Row 3: Start / Pause / Resume Primary CTA */}
            <button
              type="button"
              onClick={() => toggleTimer(habit)}
              className="w-full min-h-[54px] rounded-full bg-[#FF6A00] text-white text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A00]/30 active:scale-[0.98] transition-all"
            >
              {snapshot.isRunning ? (
                <>
                  <Pause size={18} fill="#FFFFFF" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="#FFFFFF" />
                  <span>{snapshot.hasStarted ? 'Resume Timer' : 'Start Timer'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

