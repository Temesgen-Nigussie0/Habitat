import { useState } from 'react'
import {
  Award,
  Flame,
  Lock,
  Shield,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import type { MilestoneBadgeData } from '../lib/analytics'

interface MilestoneBadgesSectionProps {
  badges: MilestoneBadgeData[]
}

const BADGE_ICONS: Record<string, typeof Zap> = {
  ignition: Zap,
  '7_streak': Flame,
  '21_habit': Star,
  boss_conqueror: Trophy,
  iron_will: Shield,
  century_club: Award,
}

export default function MilestoneBadgesSection({
  badges,
}: MilestoneBadgesSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const [selectedBadge, setSelectedBadge] = useState<MilestoneBadgeData | null>(
    null
  )

  const unlockedCount = badges.filter((b) => b.isUnlocked).length

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
        DYNAMIC MILESTONE BADGES
      </p>
      <h2 className="mt-0.5 text-[16px] font-bold text-[#F5F5F7]">
        Unlocked Trophies ({unlockedCount}/{badges.length})
      </h2>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.id] ?? Star
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              style={
                badge.isUnlocked
                  ? {
                      background: `linear-gradient(180deg, ${badge.accentColor}2E 0%, #161618 100%)`,
                      borderColor: `${badge.accentColor}99`,
                    }
                  : undefined
              }
              className={`flex h-[115px] flex-col items-center justify-center rounded-[20px] border p-2.5 text-center transition-transform active:scale-95 ${
                badge.isUnlocked
                  ? ''
                  : 'border-[#242428] bg-[#161618]'
              }`}
            >
              <div
                style={
                  badge.isUnlocked
                    ? {
                        backgroundColor: `${badge.accentColor}38`,
                        borderColor: badge.accentColor,
                        boxShadow: prefersReducedMotion
                          ? undefined
                          : `0 0 14px ${badge.accentColor}55`,
                      }
                    : undefined
                }
                className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                  badge.isUnlocked
                    ? ''
                    : 'border-[#2C2C30] bg-[#0D0D0E]'
                }`}
              >
                {badge.isUnlocked ? (
                  <Icon
                    className="h-6 w-6"
                    style={{ color: badge.accentColor }}
                  />
                ) : (
                  <Lock className="h-[18px] w-[18px] text-[#636366]" />
                )}
              </div>

              <span
                className={`mt-2 w-full truncate text-[11px] ${
                  badge.isUnlocked
                    ? 'font-bold text-[#F5F5F7]'
                    : 'font-medium text-[#8E8E93]'
                }`}
              >
                {badge.title}
              </span>

              <span
                style={badge.isUnlocked ? { color: badge.accentColor } : undefined}
                className={`mt-0.5 text-[8px] font-black tracking-[0.5px] ${
                  badge.isUnlocked ? '' : 'text-[#636366]'
                }`}
              >
                {badge.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedBadge(null)}
          />
          <div
            style={{ borderColor: `${selectedBadge.accentColor}99` }}
            className="relative z-10 w-full max-w-[360px] rounded-[26px] border-[1.5px] bg-[#161618] p-6 text-center shadow-2xl"
          >
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedBadge(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#242428] text-[#A1A1AA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const Icon = BADGE_ICONS[selectedBadge.id] ?? Star
              return (
                <div
                  style={{
                    backgroundColor: `${selectedBadge.accentColor}30`,
                    borderColor: selectedBadge.accentColor,
                  }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2"
                >
                  {selectedBadge.isUnlocked ? (
                    <Icon
                      className="h-10 w-10"
                      style={{ color: selectedBadge.accentColor }}
                    />
                  ) : (
                    <Lock className="h-8 w-8 text-[#8E8E93]" />
                  )}
                </div>
              )
            })()}

            <h3 className="mt-4 text-[18px] font-bold text-[#F5F5F7]">
              {selectedBadge.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#A1A1AA]">
              {selectedBadge.description}
            </p>

            <div className="mt-4 rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Unlock Requirement
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[#FF6A00]">
                {selectedBadge.unlockRequirement}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

