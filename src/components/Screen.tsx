import { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface ScreenProps {
  children: ReactNode
  className?: string
  noNav?: boolean
}

export default function Screen({ children, className = '', noNav = false }: ScreenProps) {
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
      {children}
      {!noNav && <BottomNav />}
    </div>
  )
}

