import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Flame, Fingerprint, Zap } from 'lucide-react'
import { completeOnboarding } from '../db/actions'
import {
  Q1_FOCUS_OPTIONS,
  Q2_CONSISTENCY_OPTIONS,
  Q3_HURDLE_OPTIONS,
  Q4_HABIT_LOAD_OPTIONS,
  Q5_PRIME_TIME_OPTIONS,
  Q6_STARTER_HABITS,
  Q7_MOTIVATION_OPTIONS,
  Q8_TIME_COMMITMENT_OPTIONS,
  Q9_BRIEFING_TIMES,
  DEFAULT_OCCUPATIONS,
  toggleStarterHabitSelection,
  buildProfileFromOnboarding,
  type OnboardingFormState,
  type OnboardingOption,
} from '../lib/onboarding'

const TOTAL_QUESTIONS = 10

const INITIAL_STATE: OnboardingFormState = {
  focusArea: '',
  currentConsistency: '',
  frictionHurdle: '',
  targetHabitLoad: '',
  primeZone: '',
  selectedHabits: [],
  motivationStyle: '',
  timeCommitment: '',
  briefingTime: '',
  pledgeAccepted: false,
  userName: '',
  headline: '',
  selectedOccupations: [],
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  // step: 0 = Welcome, 1..10 = Questions 1..10, 11 = Final Calibration
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_STATE)
  const [customOccupation, setCustomOccupation] = useState('')
  const [extraOccupations, setExtraOccupations] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Q10 Press & Hold state (2 seconds)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [pledgeVerified, setPledgeVerified] = useState(false)
  const rafRef = useRef<number | null>(null)
  const holdStartRef = useRef<number>(0)

  const goNext = useCallback(() => {
    setDirection(1)
    setStep((s) => Math.min(11, s + 1))
  }, [])

  const goBack = useCallback(() => {
    setDirection(-1)
    setStep((s) => Math.max(0, s - 1))
  }, [])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const startHold = () => {
    if (pledgeVerified) return
    setIsHolding(true)
    holdStartRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current
      const pct = Math.min(1, elapsed / 2000)
      setHoldProgress(pct)
      if (pct >= 1) {
        setIsHolding(false)
        setPledgeVerified(true)
        setForm((prev) => ({ ...prev, pledgeAccepted: true }))
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(80)
        }
        setTimeout(() => {
          setDirection(1)
          setStep(11)
        }, 420)
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const cancelHold = () => {
    if (pledgeVerified) return
    setIsHolding(false)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setHoldProgress(0)
  }

  const canProceed = (() => {
    switch (step) {
      case 1:
        return form.focusArea.length > 0
      case 2:
        return form.currentConsistency.length > 0
      case 3:
        return form.frictionHurdle.length > 0
      case 4:
        return form.targetHabitLoad.length > 0
      case 5:
        return form.primeZone.length > 0
      case 6:
        return form.selectedHabits.length >= 2 && form.selectedHabits.length <= 4
      case 7:
        return form.motivationStyle.length > 0
      case 8:
        return form.timeCommitment.length > 0
      case 9:
        return form.briefingTime.length > 0
      default:
        return false
    }
  })()

  const handleAddCustomOccupation = () => {
    const trimmed = customOccupation.trim()
    if (!trimmed) return
    if (!DEFAULT_OCCUPATIONS.includes(trimmed) && !extraOccupations.includes(trimmed)) {
      setExtraOccupations((prev) => [...prev, trimmed])
    }
    if (!form.selectedOccupations.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        selectedOccupations: [...prev.selectedOccupations, trimmed],
      }))
    }
    setCustomOccupation('')
  }

  const toggleOccupation = (occ: string) => {
    setForm((prev) => ({
      ...prev,
      selectedOccupations: prev.selectedOccupations.includes(occ)
        ? prev.selectedOccupations.filter((o) => o !== occ)
        : [...prev.selectedOccupations, occ],
    }))
  }

  const handleFinish = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const profileData = buildProfileFromOnboarding(form)
      await completeOnboarding(profileData, form.selectedHabits)
      navigate('/', { replace: true })
    } finally {
      setIsSaving(false)
    }
  }

  const slideVariants = {
    enter: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? 48 : -48, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? -48 : 48, opacity: 0 },
  }

  const progressPct = step >= 1 && step <= 10 ? (step / TOTAL_QUESTIONS) * 100 : step === 11 ? 100 : 0
  const paddedStep = String(Math.min(step, TOTAL_QUESTIONS)).padStart(2, '0')
  const allOccupations = [...DEFAULT_OCCUPATIONS, ...extraOccupations]

  return (
    <div
      className="bg-obsidian text-text-primary flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Top Progress Header (steps 1..11) */}
      {step >= 1 && (
        <header className="px-5 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="w-11 h-11 rounded-full bg-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} className="text-text-primary" />
            </button>

            <div className="px-3.5 py-1.5 rounded-full bg-elevated border border-border text-xs font-medium">
              {step <= 10 ? (
                <>
                  <span className="text-orange font-bold">Question {paddedStep}</span>
                  <span className="text-text-tertiary"> of 10</span>
                </>
              ) : (
                <span className="text-orange font-bold">Final Calibration</span>
              )}
            </div>

            <div className="w-11" />
          </div>

          <div className="w-full h-1.5 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-orange transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>
      )}

      {/* Main Animated Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="min-h-full flex flex-col"
          >
            {step === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
                {/* Hero circle with subtle wave rings */}
                <div className="relative w-56 h-56 flex items-center justify-center mb-6">
                  <div
                    className="absolute inset-2 rounded-full border border-orange/25"
                    style={{ boxShadow: '0 0 40px rgba(255,106,0,0.16)' }}
                  />
                  <div className="absolute inset-5 rounded-full border border-orange/40" />
                  <img
                    src="/hero_habit_onboard.jpg"
                    alt="Habitat"
                    className="w-44 h-44 rounded-full object-cover border-2 border-orange/70 relative z-10"
                  />
                </div>

                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border mb-4"
                  style={{
                    backgroundColor: 'rgba(255,106,0,0.14)',
                    borderColor: 'rgba(255,106,0,0.4)',
                  }}
                >
                  <Zap size={13} className="text-orange" />
                  <span className="text-orange text-[11px] font-bold tracking-[0.08em] uppercase">
                    PRECISION HABIT ARCHITECTURE
                  </span>
                </div>

                <h1 className="text-[32px] font-extrabold text-text-primary leading-tight tracking-tight">
                  Habitat
                </h1>
                <p className="text-[19px] font-bold text-text-primary mt-1 leading-snug">
                  Build Habits That Actually Stick
                </p>
                <p className="text-text-secondary text-sm leading-relaxed mt-3 max-w-[320px]">
                  Engineered for students, developers &amp; creators. 10 brief lifestyle questions to
                  calibrate your daily streak momentum.
                </p>

                <button
                  type="button"
                  onClick={goNext}
                  className="mt-8 w-full max-w-[320px] min-h-[54px] rounded-full bg-orange text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: '0 6px 24px rgba(255,106,0,0.38)' }}
                >
                  <span>Get started</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            )}

            {step === 1 && (
              <QuestionWrapper
                tag="Question 01 of 10"
                title="What is your primary focus area right now?"
                description="Choose your core discipline objective:"
              >
                <SingleChoiceList
                  options={Q1_FOCUS_OPTIONS}
                  selected={form.focusArea}
                  onSelect={(val) => setForm((p) => ({ ...p, focusArea: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 2 && (
              <QuestionWrapper
                tag="Question 02 of 10"
                title="How consistent are you with your habits today?"
                description="Honesty helps calibrate the starting challenge:"
              >
                <SingleChoiceList
                  options={Q2_CONSISTENCY_OPTIONS}
                  selected={form.currentConsistency}
                  onSelect={(val) => setForm((p) => ({ ...p, currentConsistency: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 3 && (
              <QuestionWrapper
                tag="Question 03 of 10"
                title="What usually breaks your streak?"
                description="We design safeguards against your main friction point:"
              >
                <SingleChoiceList
                  options={Q3_HURDLE_OPTIONS}
                  selected={form.frictionHurdle}
                  onSelect={(val) => setForm((p) => ({ ...p, frictionHurdle: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 4 && (
              <QuestionWrapper
                tag="Question 04 of 10"
                title="How many daily habits feel realistic to start?"
                description="Start small to establish unbreakable momentum:"
              >
                <SingleChoiceList
                  options={Q4_HABIT_LOAD_OPTIONS}
                  selected={form.targetHabitLoad}
                  onSelect={(val) => setForm((p) => ({ ...p, targetHabitLoad: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 5 && (
              <QuestionWrapper
                tag="Question 05 of 10"
                title="When is your prime focus window?"
                description="Align hardest habits with your natural energy rhythm:"
              >
                <SingleChoiceList
                  options={Q5_PRIME_TIME_OPTIONS}
                  selected={form.primeZone}
                  onSelect={(val) => setForm((p) => ({ ...p, primeZone: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 6 && (
              <QuestionWrapper
                tag="Question 06 of 10"
                title="Choose your starter habits"
                description={`Select 2 to 4 habits for your routine (${form.selectedHabits.length}/4 selected):`}
              >
                <div className="space-y-2.5 pb-4">
                  {Q6_STARTER_HABITS.map((opt) => {
                    const isSelected = form.selectedHabits.includes(opt.title)
                    const atLimit = form.selectedHabits.length >= 4 && !isSelected
                    return (
                      <OptionCard
                        key={opt.title}
                        option={opt}
                        isSelected={isSelected}
                        disabled={atLimit}
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            selectedHabits: toggleStarterHabitSelection(p.selectedHabits, opt.title),
                          }))
                        }
                      />
                    )
                  })}
                </div>
              </QuestionWrapper>
            )}

            {step === 7 && (
              <QuestionWrapper
                tag="Question 07 of 10"
                title="What kind of accountability drives you most?"
                description="Customizes your dashboard visual feedback loops:"
              >
                <SingleChoiceList
                  options={Q7_MOTIVATION_OPTIONS}
                  selected={form.motivationStyle}
                  onSelect={(val) => setForm((p) => ({ ...p, motivationStyle: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 8 && (
              <QuestionWrapper
                tag="Question 08 of 10"
                title="How much daily time can you dedicate?"
                description="We structure your habits so they never feel burdensome:"
              >
                <SingleChoiceList
                  options={Q8_TIME_COMMITMENT_OPTIONS}
                  selected={form.timeCommitment}
                  onSelect={(val) => setForm((p) => ({ ...p, timeCommitment: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 9 && (
              <QuestionWrapper
                tag="Question 09 of 10"
                title="When should your daily briefing arrive?"
                description="Choose your ideal moment for your daily check-in prompt:"
              >
                <SingleChoiceList
                  options={Q9_BRIEFING_TIMES}
                  selected={form.briefingTime}
                  onSelect={(val) => setForm((p) => ({ ...p, briefingTime: val }))}
                />
              </QuestionWrapper>
            )}

            {step === 10 && (
              <div className="px-5 pt-2 pb-8 flex flex-col items-center">
                <div className="w-full mb-3">
                  <p className="text-orange text-[11px] font-bold tracking-[0.08em] uppercase">
                    Question 10 of 10
                  </p>
                  <h2 className="text-2xl font-bold text-text-primary mt-1.5 leading-snug">
                    Seal your commitment
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">
                    Habits are an identity shift. Press and hold to seal your pact.
                  </p>
                </div>

                {/* The Pact Card */}
                <div
                  className="w-full rounded-[26px] bg-elevated p-5 border mt-2"
                  style={{ borderColor: 'rgba(255,106,0,0.45)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={20} className="text-orange" />
                    <span className="text-orange text-xs font-bold tracking-[0.08em] uppercase">
                      THE HABITAT PACT
                    </span>
                  </div>
                  <p className="text-text-primary text-sm leading-relaxed font-medium">
                    “I commit to consistency over perfection. I will show up, even on hard days,
                    aiming to be 1% better. A missed day is never missed twice.”
                  </p>
                </div>

                {/* Press & Hold 2 Seconds Button */}
                <div className="mt-8 flex flex-col items-center">
                  <p
                    className="text-sm font-semibold mb-4 text-center"
                    style={{ color: pledgeVerified ? '#30D158' : '#FF6A00' }}
                  >
                    {pledgeVerified
                      ? 'Pact Verified & Sealed ✓'
                      : isHolding
                        ? 'Keep holding to seal covenant...'
                        : 'Press and hold for 2 seconds to seal pact'}
                  </p>

                  <button
                    type="button"
                    onPointerDown={startHold}
                    onPointerUp={cancelHold}
                    onPointerLeave={cancelHold}
                    onPointerCancel={cancelHold}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label="Press and hold for 2 seconds to seal pact"
                    className="relative w-24 h-24 rounded-full flex items-center justify-center select-none active:scale-95 transition-transform"
                    style={{
                      touchAction: 'none',
                      backgroundColor: pledgeVerified
                        ? 'rgba(48,209,88,0.18)'
                        : 'rgba(255,106,0,0.14)',
                    }}
                  >
                    {/* Filling Ring SVG */}
                    <svg
                      width={96}
                      height={96}
                      className="absolute inset-0 -rotate-90"
                      aria-hidden
                    >
                      <circle
                        cx={48}
                        cy={48}
                        r={44}
                        fill="none"
                        stroke={pledgeVerified ? '#30D158' : 'rgba(255,106,0,0.35)'}
                        strokeWidth={3}
                      />
                      <circle
                        cx={48}
                        cy={48}
                        r={44}
                        fill="none"
                        stroke={pledgeVerified ? '#30D158' : '#FF6A00'}
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 44}
                        strokeDashoffset={
                          2 * Math.PI * 44 * (1 - (pledgeVerified ? 1 : holdProgress))
                        }
                      />
                    </svg>

                    {pledgeVerified ? (
                      <Check size={40} className="text-green" strokeWidth={2.5} />
                    ) : (
                      <Fingerprint size={44} className="text-orange" />
                    )}
                  </button>

                  <span
                    className="text-[10px] font-bold tracking-[0.1em] uppercase mt-3"
                    style={{ color: pledgeVerified ? '#30D158' : '#6E6E7A' }}
                  >
                    {pledgeVerified ? 'VERIFIED' : 'HOLD TO SEAL'}
                  </span>
                </div>
              </div>
            )}

            {step === 11 && (
              <div className="px-5 pt-2 pb-8 space-y-5">
                <div>
                  <p className="text-orange text-[11px] font-bold tracking-[0.08em] uppercase">
                    Final Calibration: Your Profile &amp; Craft
                  </p>
                  <h2 className="text-2xl font-bold text-text-primary mt-1.5 leading-snug">
                    Tell Us What Defines You
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">
                    Customize your name, headline, and domain specializations for your dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-1.5">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm((p) => ({ ...p, userName: e.target.value }))}
                    placeholder="e.g. Alex, Jordan"
                    className="w-full min-h-[48px] px-4 py-3 rounded-[14px] bg-elevated border border-border text-text-primary text-[16px] placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                  />
                </div>

                <div>
                  <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-1.5">
                    HEADLINE / CRAFT TITLE
                  </label>
                  <input
                    type="text"
                    value={form.headline}
                    onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
                    placeholder="e.g. CS Student & Visual Creator"
                    className="w-full min-h-[48px] px-4 py-3 rounded-[14px] bg-elevated border border-border text-text-primary text-[16px] placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                  />
                </div>

                <div>
                  <label className="block text-orange text-[11px] font-bold tracking-[0.08em] uppercase mb-1">
                    CHOOSE YOUR FIELDS &amp; OCCUPATIONS
                  </label>
                  <p className="text-text-secondary text-xs mb-3">
                    Select what describes you or add your custom occupation:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {allOccupations.map((occ) => {
                      const isSelected = form.selectedOccupations.includes(occ)
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => toggleOccupation(occ)}
                          className="min-h-[44px] px-3.5 py-2 rounded-[12px] border text-xs font-medium flex items-center gap-1.5 transition-colors"
                          style={{
                            backgroundColor: isSelected ? 'rgba(255,106,0,0.14)' : '#14141A',
                            borderColor: isSelected ? '#FF6A00' : '#22222E',
                            color: isSelected ? '#FF6A00' : '#F7F7FA',
                          }}
                        >
                          {isSelected && <Check size={14} />}
                          <span>{occ}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={customOccupation}
                      onChange={(e) => setCustomOccupation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCustomOccupation()
                        }
                      }}
                      placeholder="Add custom occupation (e.g. 3D Artist)"
                      className="flex-1 min-h-[46px] px-3.5 py-2.5 rounded-[12px] bg-elevated border border-border text-text-primary text-[16px] placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomOccupation}
                      disabled={!customOccupation.trim()}
                      className="min-h-[46px] px-4 rounded-[12px] bg-orange text-white font-bold text-sm disabled:bg-elevated disabled:text-text-tertiary"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="w-full min-h-[54px] rounded-[16px] bg-orange text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  <span>{isSaving ? 'Setting up...' : 'Enter Habitat Dashboard'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Next Bar for Questions 1..9 */}
      {step >= 1 && step <= 9 && (
        <div className="px-5 py-3 bg-obsidian/95 border-t border-border/60 flex-shrink-0">
          <button
            type="button"
            disabled={!canProceed}
            onClick={goNext}
            className="w-full min-h-[54px] rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: canProceed ? '#FF6A00' : '#1E1E26',
              color: canProceed ? '#FFFFFF' : '#6E6E7A',
            }}
          >
            <span>Next</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

function QuestionWrapper({
  tag,
  title,
  description,
  children,
}: {
  tag: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="px-5 pt-2 pb-4">
      <p className="text-orange text-[11px] font-bold tracking-[0.08em] uppercase">{tag}</p>
      <h2 className="text-2xl font-bold text-text-primary mt-1.5 leading-snug">{title}</h2>
      <p className="text-text-secondary text-sm mt-1 mb-4">{description}</p>
      {children}
    </div>
  )
}

function SingleChoiceList({
  options,
  selected,
  onSelect,
}: {
  options: OnboardingOption[]
  selected: string
  onSelect: (title: string) => void
}) {
  return (
    <div className="space-y-3 pb-4">
      {options.map((opt) => (
        <OptionCard
          key={opt.title}
          option={opt}
          isSelected={selected === opt.title}
          onClick={() => onSelect(opt.title)}
        />
      ))}
    </div>
  )
}

function OptionCard({
  option,
  isSelected,
  disabled = false,
  onClick,
}: {
  option: OnboardingOption
  isSelected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-[26px] p-4 border transition-all flex items-center gap-3.5 active:scale-[0.99]"
      style={{
        backgroundColor: isSelected ? '#1B1B24' : '#14141A',
        borderColor: isSelected ? '#FF6A00' : '#22222E',
        borderWidth: isSelected ? 1.5 : 1,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div
        className="w-12 h-12 rounded-[18px] flex items-center justify-center text-2xl flex-shrink-0 border"
        style={{
          backgroundColor: isSelected ? 'rgba(255,106,0,0.14)' : '#1B1B24',
          borderColor: isSelected ? 'rgba(255,106,0,0.5)' : '#323242',
        }}
      >
        {option.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[15px] leading-snug"
            style={{
              color: '#F7F7FA',
              fontWeight: isSelected ? 700 : 500,
            }}
          >
            {option.title}
          </span>
          {option.badge && (
            <span
              className="px-1.5 py-0.5 rounded-[8px] text-[10px] font-bold"
              style={{
                backgroundColor: 'rgba(255,106,0,0.14)',
                color: '#FF6A00',
              }}
            >
              {option.badge}
            </span>
          )}
        </div>
        <p className="text-text-secondary text-[13px] leading-snug mt-0.5">{option.subtitle}</p>
      </div>

      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border"
        style={{
          backgroundColor: isSelected ? '#FF6A00' : 'transparent',
          borderColor: isSelected ? '#FF6A00' : '#323242',
        }}
      >
        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
      </div>
    </button>
  )
}

