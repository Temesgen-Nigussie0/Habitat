import { Flame, Construction } from 'lucide-react'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'

const HAZARD_TAPE_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #FFD60A 0px, #FFD60A 18px, #111115 18px, #111115 36px)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
}

const TAPES = [
  { top: '9%', rotate: '-10deg', text: 'UNDER CONSTRUCTION • IN DEVELOPMENT • BOSS MODE' },
  { top: '24%', rotate: '7deg', text: 'CAUTION • SECTION UNDER DEVELOPMENT • COMING SOON' },
  { top: '76%', rotate: '-7deg', text: 'IN DEVELOPMENT • HIGH-STAKES MODE • STAY TUNED' },
  { top: '90%', rotate: '10deg', text: 'UNDER CONSTRUCTION • BOSS MODE • WORK IN PROGRESS' },
]

export default function BossModeScreen() {
  return (
    <Screen className="overflow-hidden">
      <div className="relative min-h-[calc(100dvh-104px)] md:min-h-[calc(100dvh-64px)] w-full flex flex-col justify-center items-center px-5 py-10 overflow-hidden">
        {/* Ambient Desktop & Mobile Spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(255, 214, 10, 0.10) 0%, rgba(255, 59, 48, 0.08) 38%, transparent 72%)',
          }}
        />

        {/* Subtle dimmed background silhouette */}
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          <Flame size={240} className="md:w-[320px] md:h-[320px]" color="#FF3B30" fill="#FF3B30" />
        </div>

        {/* 4 Yellow & Black Construction Hazard Tapes */}
        {TAPES.map((tape, idx) => (
          <div
            key={idx}
            aria-hidden
            className="pointer-events-none absolute left-[-25%] right-[-25%] h-10 md:h-11 flex items-center justify-center border-y-2 border-black/80"
            style={{
              ...HAZARD_TAPE_STYLE,
              top: tape.top,
              transform: `rotate(${tape.rotate})`,
              zIndex: idx % 2 === 0 ? 10 : 20,
            }}
          >
            <span className="px-3 py-0.5 rounded bg-black/90 text-gold text-[10px] md:text-[11px] font-black tracking-[0.14em] uppercase whitespace-nowrap">
              {tape.text}
            </span>
          </div>
        ))}

        {/* Center Info Card */}
        <div
          className="relative z-30 w-full max-w-[340px] md:max-w-[460px] rounded-[28px] border p-6 md:p-8 text-center space-y-4 backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(14, 14, 18, 0.90)',
            borderColor: 'rgba(255, 214, 10, 0.5)',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85), 0 0 48px rgba(255, 214, 10, 0.08)',
          }}
        >
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl mx-auto flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(255, 214, 10, 0.14)',
              borderColor: 'rgba(255, 214, 10, 0.45)',
            }}
          >
            <Construction size={28} color="#FFD60A" />
          </div>

          <SectionLabel className="block">BOSS MODE</SectionLabel>

          <h1 className="text-[22px] md:text-[26px] font-extrabold text-text-primary leading-tight">
            Under Construction
          </h1>

          <p className="text-text-secondary text-sm md:text-[15px] leading-relaxed">
            This section is currently in development. High-stakes challenges, streak wagers, and
            accountability protocols are being forged for an upcoming update.
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">
              Streak Wagers
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-text-secondary">
              Iron Accountability
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-text-secondary">
              7-Day Lock-In
            </span>
          </div>
        </div>
      </div>
    </Screen>
  )
}
