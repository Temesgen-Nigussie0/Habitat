import { Camera, Pencil, Zap } from 'lucide-react'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'

const OCCUPATIONS = [
  { emoji: '🎓', label: 'University Academics' },
  { emoji: '🔥', label: 'Founder / Business' },
  { emoji: '💻', label: 'Computer Science' },
]

const BLUEPRINT_ITEMS = [
  { emoji: '⚡', label: 'Primary Focus Area', value: 'Mental Clarity' },
  { emoji: '📊', label: 'Baseline Consistency', value: 'Hot and cold' },
  { emoji: '🛡️', label: 'Streak Safeguard', value: 'Motivation dips after days' },
  { emoji: '🕐', label: 'Prime Time Window', value: 'Early Morning' },
  { emoji: '⏰', label: 'Daily Prompt', value: '08:00 AM' },
]

export default function ProfileScreen() {
  return (
    <Screen>
      {/* Banner */}
      <div
        className="relative flex-shrink-0"
        style={{
          height: 180,
          background: 'linear-gradient(180deg, #1B1B24 0%, rgba(255,106,0,0.18) 60%, #000 100%)',
        }}
      >
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center border"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: '#22222E' }}
        >
          <Camera size={18} color="#F7F7FA" />
        </button>

        {/* Avatar overlapping the banner bottom */}
        <div className="absolute -bottom-10 left-5">
          <div
            className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center overflow-hidden text-3xl"
            style={{ borderColor: '#FF6A00', backgroundColor: '#14141A' }}
          >
            👤
          </div>
        </div>
      </div>

      <div className="px-5 pt-14 space-y-5 pb-4">
        {/* Name row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-3">
            <h1 className="text-[26px] font-bold text-text-primary leading-tight">Abi</h1>
            <p className="text-orange font-semibold text-sm mt-0.5">temari</p>
            <p className="text-text-secondary text-sm mt-2 leading-relaxed">
              Designing software systems, crafting cinematic edits, and engineering
              daily relentless habits.
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border mt-1 flex-shrink-0"
            style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
          >
            <Pencil size={12} color="#A0A0AB" />
            <span className="text-text-secondary text-xs font-medium">Edit Bio</span>
          </button>
        </div>

        {/* Occupation chips */}
        <div className="flex flex-wrap gap-2">
          {OCCUPATIONS.map(o => (
            <div
              key={o.label}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border"
              style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
            >
              <span className="text-sm">{o.emoji}</span>
              <span className="text-text-secondary text-xs font-medium">{o.label}</span>
            </div>
          ))}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'HABITS', value: '0 active', color: '#FF6A00' },
            { label: 'TASKS DONE', value: '0 / 0', color: '#30D158' },
            { label: 'STATUS', value: 'Starting', color: '#0A84FF' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-[18px] border p-3"
              style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
            >
              <p className="text-text-tertiary text-[9px] font-bold tracking-widest uppercase">
                {s.label}
              </p>
              <p className="font-bold text-sm mt-1.5" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Lifestyle blueprint */}
        <div>
          <SectionLabel className="mb-3 block">LIFESTYLE BLUEPRINT</SectionLabel>
          <div className="space-y-3">
            {BLUEPRINT_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-[20px] border p-4 flex items-center gap-3"
                style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
              >
                <div
                  className="w-11 h-11 rounded-[12px] border flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(255,106,0,0.14)',
                    borderColor: 'rgba(255,106,0,0.3)',
                  }}
                >
                  {item.emoji}
                </div>
                <div>
                  <p className="text-text-secondary text-xs">{item.label}</p>
                  <p className="text-text-primary font-bold text-base mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings section */}
        <div>
          <SectionLabel className="mb-3 block">DATA & SETTINGS</SectionLabel>
          <div className="space-y-2">
            {[
              { label: '📤  Export Backup', desc: 'Download all your data as JSON' },
              { label: '📥  Import Backup', desc: 'Restore from a backup file' },
            ].map(item => (
              <button
                key={item.label}
                className="w-full rounded-[18px] border p-4 flex flex-col items-start text-left"
                style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
              >
                <span className="text-text-primary text-sm font-semibold">{item.label}</span>
                <span className="text-text-tertiary text-xs mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  )
}

