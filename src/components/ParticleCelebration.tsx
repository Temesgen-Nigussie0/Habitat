import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

interface ParticleCelebrationProps {
  active: boolean
  onComplete: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
}

const COLORS = ['#FF6A00', '#FF7A1A', '#FFD60A', '#30D158', '#0A84FF']

export default function ParticleCelebration({ active, onComplete }: ParticleCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion) {
      onComplete()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const originX = width * 0.5
    const originY = height * 0.42

    const particles: Particle[] = Array.from({ length: 48 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 120 + Math.random() * 260
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 3 + Math.random() * 4.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    const duration = 1500
    const start = performance.now()
    let rafId = 0

    const frame = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const dt = 1 / 60

      ctx.clearRect(0, 0, width, height)
      const alpha = Math.max(0, 1 - t)

      for (const p of particles) {
        p.vy += 280 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.35), 0, Math.PI * 2)
        ctx.fill()
      }

      if (t < 1) {
        rafId = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, width, height)
        onComplete()
      }
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [active, prefersReducedMotion, onComplete])

  if (!active || prefersReducedMotion) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ width: '100vw', height: '100dvh' }}
      aria-hidden
    />
  )
}

