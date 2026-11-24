import { ReactNode, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import BottomNav from './BottomNav'
import { getAmbientMood } from '../lib/ambientTheme'

interface ScreenProps {
  children: ReactNode
  className?: string
  noNav?: boolean
}

export default function Screen({ children, className = '', noNav = false }: ScreenProps) {
  const prefersReduced = useReducedMotion()
  const ambient = useMemo(() => getAmbientMood(), [])

  return (
    <div
      className={`relative bg-black overflow-y-auto overflow-x-hidden scrollbar-hidden ${className}`}
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        // Extra bottom padding to clear the floating nav
        paddingBottom: noNav
          ? 'env(safe-area-inset-bottom)'
          : 'calc(env(safe-area-inset-bottom) + 90px)',
      }}
    >
      {/* Dynamic Time-of-Day Ambient Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[280px] z-0"
        style={{ background: ambient.gradient }}
      />

      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full min-h-full"
      >
        {children}
      </motion.div>
      {!noNav && <BottomNav />}
    </div>
  )
}
