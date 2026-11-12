import { Check, Flame, Snowflake } from 'lucide-react'
import type { UserProfile } from '../db/types'
import { getTodayLocal } from '../lib/streak'

interface StreakFreezeProtocolCardProps {
  profile?: UserProfile | null
  isTodayFrozen?: boolean
  onActivateFreeze: () => void
  onToggleComeback: (active: boolean) => void
}

export default function StreakFreezeProtocolCard({
  profile,
  isTodayFrozen = false,
  onActivateFreeze,
  onToggleComeback,
}: StreakFreezeProtocolCardProps) {
  const freezesAvailable = profile?.streakFreezesAvailable ?? 1
  const isComebackActive = profile?.isComebackProtocolActive ?? false
  const today = getTodayLocal()
  const alreadyFrozenToday = isTodayFrozen || profile?.lastFreezeDate === today
  const canFreeze = freezesAvailable > 0 && !alreadyFrozenToday

  return (
    <div
      className="rounded-[22px] border border-[#0A84FF]/35 p-4"
      style={{
        background: 'linear-gradient(135deg, #0F1E2E 0%, #162A40 100%)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0A84FF]/50 bg-[#0A84FF]/20">
            <Snowflake className="h-5 w-5 text-[#0A84FF]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#0A84FF]">
              STREAK FREEZE VAULT
            </p>
            <p className="text-[14px] font-bold text-[#F5F5F7]">
              {freezesAvailable > 0
                ? `${freezesAvailable} ${freezesAvailable === 1 ? 'Shield' : 'Shields'} Available`
                : '0 Shields Available (Recharges 1st of month)'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canFreeze}
          onClick={onActivateFreeze}
          className={`min-h-[36px] shrink-0 rounded-[12px] px-3.5 text-[11px] font-bold transition-opacity active:scale-95 ${
            canFreeze
              ? 'bg-[#0A84FF] text-black'
              : 'cursor-not-allowed bg-[#0A84FF]/25 text-[#8E8E93]'
          }`}
        >
          {alreadyFrozenToday ? 'Frozen Today' : 'Freeze Day'}
        </button>
      </div>

      <p className="mt-2.5 text-[11px] leading-[16px] text-[#A1A1AA]">
        When intense university exams or client rendering marathons hit, your
        shield protects the unbroken streak without cheating.
      </p>

      {/* Never Miss Twice Comeback Protocol Toggle */}
      <button
        type="button"
        onClick={() => onToggleComeback(!isComebackActive)}
        className={`mt-3 flex w-full items-center justify-between rounded-[14px] border bg-[#0C1622] p-3 text-left transition-colors ${
          isComebackActive ? 'border-[#FF6A00]' : 'border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Flame
            className={`h-[18px] w-[18px] shrink-0 ${
              isComebackActive ? 'text-[#FF6A00]' : 'text-[#8E8E93]'
            }`}
          />
          <div>
            <p
              className={`text-[12px] font-bold ${
                isComebackActive ? 'text-[#FF6A00]' : 'text-[#F5F5F7]'
              }`}
            >
              “Never Miss Twice” Protocol
            </p>
            <p className="text-[10px] text-[#8E8E93]">
              {isComebackActive
                ? 'ACTIVATED: Focus on 1 quick win today'
                : 'Tap to toggle rapid momentum reboot'}
            </p>
          </div>
        </div>

        <div
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
            isComebackActive
              ? 'border-[#FF6A00] bg-[#FF6A00]'
              : 'border-white/25 bg-transparent'
          }`}
        >
          {isComebackActive && <Check className="h-3.5 w-3.5 text-white" />}
        </div>
      </button>
    </div>
  )
}

