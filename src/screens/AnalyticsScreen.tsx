import { Snowflake } from 'lucide-react'
import Screen from '../components/Screen'
import SectionLabel from '../components/SectionLabel'
import ProgressBar from '../components/ProgressBar'

// ─── Heatmap SVG ──────────────────────────────────────────────────────────────
function HeatmapSVG() {
  const WEEKS = 18
  const DAYS = 7
  const CELL = 11
  const GAP = 3
  const LEFT_PAD = 26  // space for day labels
  const TOP_PAD = 14   // space for month labels

  const MONTH_LABELS = [
    { label: 'Aug', week: 0 },
    { label: 'Sep', week: 4 },
    { label: 'Oct', week: 9 },
    { label: 'Nov', week: 13 },
  ]
  const DAY_LABELS = [
    { label: 'Mon', row: 1 },
    { label: 'Wed', row: 3 },
    { label: 'Fri', row: 5 },
  ]

  const totalW = WEEKS * (CELL + GAP) + LEFT_PAD
  const totalH = DAYS * (CELL + GAP) + TOP_PAD + 4

  // A few sample active cells for the placeholder
  const activeCells: Record<string, number> = {
    '13-3': 0.5, '14-3': 0.9, '14-5': 0.6, '15-1': 0.4,
  }

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${totalH}`}>
      {/* Month labels */}
      {MONTH_LABELS.map(({ label, week }) => (
        <text
          key={label}
          x={LEFT_PAD + week * (CELL + GAP)}
          y={9}
          fontSize={8}
          fill="#6E6E7A"
          fontFamily="Roboto, sans-serif"
        >
          {label}
        </text>
      ))}

      {/* Day labels */}
      {DAY_LABELS.map(({ label, row }) => (
        <text
          key={label}
          x={0}
          y={TOP_PAD + row * (CELL + GAP) + CELL - 1}
          fontSize={8}
          fill="#6E6E7A"
          fontFamily="Roboto, sans-serif"
        >
          {label}
        </text>
      ))}

      {/* Grid cells */}
      {Array.from({ length: WEEKS }, (_, w) =>
        Array.from({ length: DAYS }, (_, d) => {
          const key = `${w}-${d}`
          const intensity = activeCells[key] ?? 0
          return (
            <rect
              key={key}
              x={LEFT_PAD + w * (CELL + GAP)}
              y={TOP_PAD + d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={intensity > 0 ? `rgba(255,106,0,${intensity})` : '#1B1B24'}
            />
          )
        })
      )}
    </svg>
  )
}

// ─── Radar / Diamond Chart SVG ────────────────────────────────────────────────
function RadarChartSVG() {
  const SIZE = 160
  const cx = SIZE / 2
  const cy = SIZE / 2
  const MAX_R = SIZE * 0.4
  const LEVELS = 4

  // 4 axes: top, right, bottom, left (diamond layout)
  const AXES = ['Dev Sprints', 'Video/Media', 'Academics', 'Vitality']
  const VALUES = [0.5, 0.4, 0.5, 0.25]
  const ANGLE_OFFSET = -Math.PI / 2
  const ANGLE_STEP = (2 * Math.PI) / AXES.length

  const pt = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const gridPaths = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = (MAX_R * (lvl + 1)) / LEVELS
    return AXES.map((_, ai) => {
      const p = pt(ANGLE_OFFSET + ai * ANGLE_STEP, r)
      return `${ai === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }).join(' ') + 'Z'
  })

  const dataPoints = VALUES.map((v, ai) => pt(ANGLE_OFFSET + ai * ANGLE_STEP, v * MAX_R))
  const dataPath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ') + 'Z'

  return (
    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Axis lines */}
      {AXES.map((_, ai) => {
        const end = pt(ANGLE_OFFSET + ai * ANGLE_STEP, MAX_R)
        return (
          <line
            key={ai}
            x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="rgba(50,50,66,0.5)" strokeWidth={1}
          />
        )
      })}

      {/* Grid rings */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(50,50,66,0.5)" strokeWidth={1} />
      ))}

      {/* Data fill */}
      <path d={dataPath} fill="rgba(255,106,0,0.25)" stroke="#FF6A00" strokeWidth={1.5} />

      {/* Vertex dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#FF6A00" />
      ))}
    </svg>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  return (
    <Screen>
      <div className="px-5 pt-4 space-y-5">
        {/* Title */}
        <div>
          <SectionLabel>PERFORMANCE ANALYTICS</SectionLabel>
          <h1 className="text-[28px] font-bold text-text-primary mt-1">Productivity Matrix</h1>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'HABIT RATE', value: '0%', sub: 'Past 7 days', color: '#F7F7FA' },
            { label: 'TASKS DONE', value: '0%', sub: '0 / 0 done', color: '#30D158' },
            { label: 'ACTIONS', value: '0', sub: 'Total logged', color: '#FF6A00' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-[20px] border p-3"
              style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
            >
              <span className="text-text-tertiary text-[9px] font-bold tracking-widest uppercase">
                {stat.label}
              </span>
              <p className="text-xl font-bold mt-1" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-text-tertiary text-[10px] mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div
          className="rounded-[24px] border p-4"
          style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
        >
          <p className="text-text-primary font-bold text-base mb-3">
            0 contributions in the last year
          </p>
          <div className="overflow-x-auto scrollbar-hidden">
            <HeatmapSVG />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-text-tertiary text-[10px]">Activity consistency matrix</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-[10px]">Less</span>
              {[0.15, 0.35, 0.6, 0.85].map((o, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: `rgba(255,106,0,${o})` }}
                />
              ))}
              <span className="text-text-tertiary text-[10px]">More</span>
            </div>
          </div>
        </div>

        {/* Pillar Balance Matrix */}
        <div
          className="rounded-[24px] border p-4"
          style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <SectionLabel>PILLAR BALANCE MATRIX</SectionLabel>
              <p className="text-text-primary font-bold text-lg mt-0.5">
                Polymath Equilibrium (0%)
              </p>
            </div>
            <span
              className="px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase flex-shrink-0"
              style={{ backgroundColor: '#14141A', borderColor: '#22222E', color: '#A0A0AB' }}
            >
              CALIBRATING
            </span>
          </div>

          <div className="flex justify-center py-2">
            <div style={{ width: 160, height: 160 }}>
              <RadarChartSVG />
            </div>
          </div>

          {/* Pillar icons + labels */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { emoji: '💻', label: 'Dev Sprints', pct: '0%' },
              { emoji: '🎬', label: 'Video/Media', pct: '0%' },
              { emoji: '🎓', label: 'Academics', pct: '0%' },
              { emoji: '🔥', label: 'Vitality', pct: '0%' },
            ].map(p => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <div
                  className="w-9 h-9 rounded-full border flex items-center justify-center text-base"
                  style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
                >
                  {p.emoji}
                </div>
                <p className="text-text-tertiary text-[9px] text-center leading-tight">{p.label}</p>
                <p className="text-text-primary text-xs font-bold">{p.pct}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Production Domains */}
        <div>
          <SectionLabel className="mb-3 block">PRODUCTION DOMAINS</SectionLabel>
          <div
            className="rounded-[24px] border p-4 space-y-4"
            style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
          >
            {[
              { emoji: '💻', label: 'Software Dev', done: 0, total: 0, color: '#FF6A00' },
              { emoji: '🔥', label: 'Daily Lifestyle Habits', done: 0, total: 0, color: '#30D158' },
            ].map(d => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span>{d.emoji}</span>
                    <span className="text-text-primary font-semibold text-sm">{d.label}</span>
                  </div>
                  <span className="text-text-secondary text-xs">
                    {d.done} / {d.total} completed today
                  </span>
                </div>
                <ProgressBar value={d.total > 0 ? d.done / d.total : 0} color={d.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Streak Freeze Vault */}
        <div
          className="rounded-[24px] border p-4"
          style={{ backgroundColor: '#1B1B24', borderColor: 'rgba(10,132,255,0.3)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full border flex items-center justify-center"
                style={{ backgroundColor: 'rgba(10,132,255,0.1)', borderColor: 'rgba(10,132,255,0.3)' }}
              >
                <Snowflake size={22} color="#0A84FF" />
              </div>
              <div>
                <SectionLabel style={{ color: '#0A84FF' }}>STREAK FREEZE VAULT</SectionLabel>
                <p className="text-text-primary font-bold text-base mt-0.5">1 Shield Available</p>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-full font-bold text-white text-sm"
              style={{ backgroundColor: '#0A84FF' }}
            >
              Freeze Day
            </button>
          </div>
          <p className="text-text-secondary text-xs mt-3 leading-relaxed">
            When intense exams or client deadlines hit, your shield protects the
            unbroken streak without cheating.
          </p>
        </div>
      </div>
    </Screen>
  )
}

