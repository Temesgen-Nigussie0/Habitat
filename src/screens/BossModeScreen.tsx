import { Flame, Construction } from 'lucide-react'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'

const HAZARD_TAPE_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #FFD60A 0px, #FFD60A 18px, #111115 18px, #111115 36px)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
}

const TAPES = [
  { top: '14%', rotate: '-14deg', text: 'UNDER CONSTRUCTION • IN DEVELOPMENT • BOSS MODE' },
  { top: '34%', rotate: '10deg', text: 'CAUTION • SECTION UNDER DEVELOPMENT • COMING SOON' },
  { top: '58%', rotate: '-8deg', text: 'IN DEVELOPMENT • HIGH-STAKES MODE • STAY TUNED' },
  { top: '78%', rotate: '13deg', text: 'UNDER CONSTRUCTION • BOSS MODE • WORK IN PROGRESS' },
]

export default function BossModeScreen() {
  return (
    <Screen className="overflow-hidden">
      <div className="relative min-h-full flex flex-col justify-center items-center px-6 py-12 overflow-hidden">
        {/* Subtle dimmed background silhouette */}
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          <Flame size={220} color="#FF3B30" fill="#FF3B30" />
        </div>

        {/* 4 Yellow & Black Construction Hazard Tapes */}
        {TAPES.map((tape, idx) => (
          <div
            key={idx}
            aria-hidden
            className="pointer-events-none absolute left-[-15%] right-[-15%] h-11 flex items-center justify-center border-y-2 border-black/80"
            style={{
              ...HAZARD_TAPE_STYLE,
              top: tape.top,
              transform: `rotate(${tape.rotate})`,
              zIndex: idx % 2 === 0 ? 10 : 20,
            }}
          >
            <span className="px-3 py-0.5 rounded bg-black/90 text-gold text-[11px] font-black tracking-[0.14em] uppercase whitespace-nowrap">
              {tape.text}
            </span>
          </div>
        ))}

        {/* Center Info Card */}
        <div
          className="relative z-30 w-full max-w-[330px] rounded-[28px] border p-6 text-center space-y-3.5"
          style={{
            backgroundColor: 'rgba(14, 14, 18, 0.94)',
            borderColor: 'rgba(255, 214, 10, 0.55)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(255, 214, 10, 0.14)',
              borderColor: 'rgba(255, 214, 10, 0.45)',
            }}
          >
            <Construction size={28} color="#FFD60A" />
          </div>

          <SectionLabel className="block">BOSS MODE</SectionLabel>

          <h1 className="text-[22px] font-extrabold text-text-primary leading-tight">
            Under Construction
          </h1>

          <p className="text-text-secondary text-sm leading-relaxed">
            This section is currently in development. High-stakes challenges, streak wagers, and
            accountability protocols are being forged for an upcoming update.
          </p>
        </div>
      </div>
    </Screen>
  )
}
