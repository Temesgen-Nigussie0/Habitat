import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import type { WeeklyReviewData } from '../lib/weeklyReview'

interface WeeklyReviewModalProps {
  open: boolean
  review: WeeklyReviewData
  onClose: () => void
}

export default function WeeklyReviewModal({
  open,
  review,
  onClose,
}: WeeklyReviewModalProps) {
  const [step, setStep] = useState(0)
  const totalSlides = 4

  if (!open) return null

  const goNext = () => {
    if (step < totalSlides - 1) {
      setStep((s) => s + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const deltaPositive = review.delta >= 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
      >
        <div className="relative w-full max-w-[420px] rounded-[30px] border border-[#2C2C38] bg-[#0D0D13] overflow-hidden shadow-[0_24px_80px_rgba(255,106,0,0.18)]">
          {/* Ambient Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-50"
            style={{
              background:
                step === 0
                  ? 'radial-gradient(circle, rgba(255,106,0,0.38), transparent 70%)'
                  : step === 1
                    ? 'radial-gradient(circle, rgba(255,159,10,0.36), transparent 70%)'
                    : step === 2
                      ? 'radial-gradient(circle, rgba(10,132,255,0.32), transparent 70%)'
                      : 'radial-gradient(circle, rgba(48,209,88,0.32), transparent 70%)',
            }}
          />

          {/* Story Progress Bars */}
          <div className="relative z-10 px-5 pt-4 flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setStep(i)}
                className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: i <= step ? '100%' : '0%',
                    backgroundColor: i <= step ? '#FF6A00' : 'transparent',
                  }}
                />
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="relative z-10 px-5 pt-3 pb-1 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange/30 bg-orange/10 px-2.5 py-1">
              <Sparkles size={12} className="text-orange" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
                Your Week in Review
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Weekly Review"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Swipeable Slide Content */}
          <div className="relative z-10 px-6 py-5 min-h-[340px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -50) goNext()
                  else if (info.offset.x > 50) goPrev()
                }}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="cursor-grab active:cursor-grabbing"
              >
                {step === 0 && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-orange/15 border border-orange/35 flex items-center justify-center">
                      {deltaPositive ? (
                        <TrendingUp size={28} className="text-orange" />
                      ) : (
                        <TrendingDown size={28} className="text-[#FF9F0A]" />
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                        Weekly Completion Rate
                      </p>
                      <p className="mt-1 text-[52px] font-black leading-none text-white tabular-nums">
                        {review.thisWeekRate}%
                      </p>
                      <p className="mt-2 text-[13px] text-text-secondary">
                        {review.totalCompletedThisWeek} of {review.totalScheduledThisWeek} scheduled check-ins
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2C2C38] bg-[#16161E] px-4 py-2 text-[13px] font-bold">
                      <span
                        style={{
                          color: deltaPositive ? '#30D158' : '#FF9F0A',
                        }}
                      >
                        {review.delta > 0 ? `+${review.delta}%` : `${review.delta}%`}
                      </span>
                      <span className="text-text-secondary font-medium">
                        vs. last week ({review.lastWeekRate}%)
                      </span>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FF9F0A]/15 border border-[#FF9F0A]/35 flex items-center justify-center mb-3">
                        <Trophy size={28} className="text-[#FF9F0A]" />
                      </div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                        Streak &amp; Top Habit
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-[#252532] bg-[#14141C] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange/15 flex items-center justify-center">
                          <Flame size={20} className="text-orange" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                            Best Streak
                          </p>
                          <p className="text-[18px] font-extrabold text-white">
                            {review.bestStreak} {review.bestStreak === 1 ? 'day' : 'days'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-orange">
                        Now: {review.currentStreak}d
                      </span>
                    </div>

                    <div className="rounded-[20px] border border-[#252532] bg-[#14141C] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                        Most Consistent Habit
                      </p>
                      {review.mostConsistentHabit ? (
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <p className="text-[17px] font-extrabold text-white truncate">
                            {review.mostConsistentHabit.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-[#30D158]/15 px-2.5 py-0.5 text-[12px] font-bold text-[#30D158]">
                            {review.mostConsistentHabit.rate}%
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-[14px] text-text-secondary">
                          Complete a habit this week to crown your #1 routine.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/35 flex items-center justify-center">
                      <Clock size={28} className="text-[#0A84FF]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                        Hardest Time of Day
                      </p>
                      <p className="mt-2 text-[34px] font-black text-white">
                        {review.hardestTimeOfDay ? review.hardestTimeOfDay.timeOfDay : 'Balanced'}
                      </p>
                    </div>
                    {review.hardestTimeOfDay ? (
                      <div className="rounded-[20px] border border-[#252532] bg-[#14141C] p-4 text-[13px] text-text-secondary leading-relaxed">
                        You hit{' '}
                        <span className="font-bold text-white">
                          {review.hardestTimeOfDay.rate}%
                        </span>{' '}
                        during{' '}
                        <span className="font-bold text-[#0A84FF]">
                          {review.hardestTimeOfDay.timeOfDay}
                        </span>{' '}
                        ({review.hardestTimeOfDay.missedCount} missed out of{' '}
                        {review.hardestTimeOfDay.totalCount}).
                      </div>
                    ) : (
                      <p className="text-[13px] text-text-secondary">
                        No time-of-day dips recorded yet this week.
                      </p>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/35 flex items-center justify-center">
                      <Lightbulb size={28} className="text-[#30D158]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#30D158]">
                        Next Week&apos;s 1 Adjustment
                      </p>
                      <h3 className="mt-1.5 text-[20px] font-extrabold text-white">
                        Smart Focus Tweaks
                      </h3>
                    </div>
                    <div className="rounded-[22px] border border-[#30D158]/30 bg-[#121916] p-4 text-[14px] text-[#E4E4E7] leading-relaxed">
                      {review.suggestedAdjustment}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Controls */}
          <div className="relative z-10 px-5 pb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="h-11 px-3.5 rounded-[14px] border border-[#272733] bg-[#16161E] text-[13px] font-semibold text-text-secondary hover:text-white disabled:opacity-35 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            <span className="text-[11px] font-semibold text-text-tertiary">
              Swipe or tap ({step + 1}/{totalSlides})
            </span>

            <button
              type="button"
              onClick={goNext}
              className="h-11 px-4 rounded-[14px] bg-orange hover:brightness-110 text-[13px] font-bold text-white flex items-center gap-1 shadow-lg shadow-orange/25 transition-all"
            >
              <span>{step === totalSlides - 1 ? 'Done' : 'Next'}</span>
              {step < totalSlides - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
