import { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import BottomNav from './BottomNav'

interface ScreenProps {
  children: ReactNode
  className?: string
  noNav?: boolean
}

export default function Screen({ children, className = '', noNav = false }: ScreenProps) {
  const prefersReduced = useReducedMotion()

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
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full min-h-full"
      >
        {children}
      </motion.div>
      {!noNav && <BottomNav />}
    </div>
  )
}

