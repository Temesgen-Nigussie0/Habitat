import { Flame, Shield, Zap, AlertTriangle, Trophy } from 'lucide-react'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'

const FEATURES = [
  {
    icon: Zap,
    title: 'Extreme Accountability',
    desc: 'Set a real punishment for failing. Make the stakes hurt.',
    color: '#FF3B30',
  },
  {
    icon: Shield,
    title: 'Streak Protection',
    desc: 'Use freeze shields wisely. One miss and the challenge counts it.',
    color: '#FF3B30',
  },
  {
    icon: Flame,
    title: 'Daily Check-ins',
    desc: 'Every habit counts every day. No excuses. No skips.',
    color: '#FF3B30',
  },
  {
    icon: Trophy,
    title: 'Milestone Rewards',
    desc: 'Complete the challenge and unlock Boss Conqueror status.',
    color: '#FFD60A',
  },
]

const DURATIONS = [
  { days: 21, label: '21 Days', desc: 'Habit Formation' },
  { days: 30, label: '30 Days', desc: 'The Classic' },
  { days: 66, label: '66 Days', desc: 'Iron Will' },
  { days: 75, label: '75 Days', desc: 'Hard Core' },
  { days: 100, label: '100 Days', desc: 'Century' },
]

export default function BossModeScreen() {
  return (
    <Screen>
      <div className="px-5 pt-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(to bottom, #FF3B30, #E65100)' }}
          >
            <Flame size={24} color="white" fill="white" />
          </div>
          <div>
            <SectionLabel>HIGH STAKES MODE</SectionLabel>
            <h1 className="text-[26px] font-bold text-text-primary leading-tight mt-0.5">
              Boss Mode
            </h1>
          </div>
        </div>

        {/* No active challenge card */}
        <div
          className="rounded-[28px] border p-6 text-center space-y-3"
          style={{ backgroundColor: '#1B1B24', borderColor: 'rgba(255,59,48,0.3)' }}
        >
          <AlertTriangle size={36} color="#FF3B30" className="mx-auto" />
          <p className="text-text-primary font-bold text-lg">No Active Challenge</p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Boss Mode is a high-stakes accountability system. Set a challenge with real
            consequences — commit, or don't start.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="rounded-[20px] border p-4 flex gap-3 items-start"
              style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 border"
                style={{
                  backgroundColor: color + '1A',
                  borderColor: color + '44',
                }}
              >
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="text-text-primary font-semibold text-sm">{title}</p>
                <p className="text-text-tertiary text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Duration chips */}
        <div>
          <SectionLabel className="mb-3 block">CHALLENGE DURATIONS</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map(({ days, label, desc }) => (
              <div
                key={days}
                className="flex flex-col items-center px-4 py-2.5 rounded-[16px] border"
                style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
              >
                <span className="text-text-primary text-sm font-bold">{label}</span>
                <span className="text-text-tertiary text-[10px]">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA button */}
        <button
          className="w-full py-4 rounded-[20px] font-bold text-white text-base"
          style={{ background: 'linear-gradient(to right, #FF3B30, #FF6A00)' }}
        >
          🔥  Start a Challenge
        </button>
      </div>
    </Screen>
  )
}

