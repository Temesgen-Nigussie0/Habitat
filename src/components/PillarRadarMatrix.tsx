import { useEffect, useState } from 'react'
import { Code, Film, Flame, GraduationCap } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import type { PillarScoresResult } from '../lib/analytics'

interface PillarRadarMatrixProps {
  scores: PillarScoresResult
}

export default function PillarRadarMatrix({ scores }: PillarRadarMatrixProps) {
  const prefersReducedMotion = useReducedMotion()
  const [animProgress, setAnimProgress] = useState(prefersReducedMotion ? 1 : 0)

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimProgress(1)
      return
    }
    let rafId = 0
    const duration = 1000
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimProgress(eased)
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [prefersReducedMotion, scores.dev, scores.video, scores.academics, scores.vitality])

  const size = 200
  const center = size / 2
  const maxRadius = 82
  const ringFractions = [0.33, 0.66, 1.0]
  const rawScores = [
    scores.dev / 100,
    scores.video / 100,
    scores.academics / 100,
    scores.vitality / 100,
  ]

  const getPoint = (index: number, radius: number) => {
    const angle = (index * Math.PI) / 2 - Math.PI / 2
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  }

  const ringPolygons = ringFractions.map((frac) =>
    [0, 1, 2, 3]
      .map((i) => {
        const pt = getPoint(i, maxRadius * frac)
        return `${pt.x},${pt.y}`
      })
      .join(' ')
  )

  const userPoints = rawScores.map((s, i) =>
    getPoint(i, maxRadius * s * animProgress)
  )
  const userPolygonPoints = userPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const legend = [
    {
      label: 'Dev Sprints',
      pct: scores.dev,
      color: '#FF6A00',
      Icon: Code,
    },
    {
      label: 'Video/Media',
      pct: scores.video,
      color: '#FF9F0A',
      Icon: Film,
    },
    {
      label: 'Academics',
      pct: scores.academics,
      color: '#0A84FF',
      Icon: GraduationCap,
    },
    {
      label: 'Vitality',
      pct: scores.vitality,
      color: '#30D158',
      Icon: Flame,
    },
  ]

  return (
    <div className="rounded-[22px] border border-[#242428] bg-[#161618] p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
            PILLAR BALANCE MATRIX
          </p>
          <h2 className="mt-0.5 text-[15px] font-bold text-[#F5F5F7]">
            Polymath Equilibrium ({scores.balance}%)
          </h2>
        </div>

        <span className="rounded-[8px] border border-[#FF6A00]/35 bg-[#FF6A00]/15 px-2.5 py-1 text-[10px] font-bold text-[#FF6A00]">
          {scores.status}
        </span>
      </div>

      {/* Diamond Radar SVG */}
      <div className="mt-4 flex h-[210px] items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Pillar balance radar chart showing ${scores.balance}% equilibrium`}
        >
          {/* 3 Nested Diamond Rings */}
          {ringPolygons.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
            />
          ))}

          {/* 4 Radial Axis Rays */}
          {[0, 1, 2, 3].map((i) => {
            const end = getPoint(i, maxRadius)
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.24)"
                strokeWidth="1"
              />
            )
          })}

          {/* User Footprint Polygon */}
          <polygon
            points={userPolygonPoints}
            fill="rgba(255, 106, 0, 0.30)"
            stroke="#FF6A00"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* White-centered Vertex Dots */}
          {userPoints.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="4.5" fill="#FF6A00" />
              <circle cx={pt.x} cy={pt.y} r="2" fill="#FFFFFF" />
            </g>
          ))}
        </svg>
      </div>

      {/* 4-Item Legend */}
      <div className="mt-3.5 grid grid-cols-4 gap-2">
        {legend.map(({ label, pct, color, Icon }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}22` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <span className="mt-1.5 text-[10px] font-medium text-[#A1A1AA]">
              {label}
            </span>
            <span className="mt-0.5 text-[13px] font-bold text-[#F5F5F7]">
              {pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

