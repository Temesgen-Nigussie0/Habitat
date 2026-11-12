import { ReactNode } from 'react'

interface ChipProps {
  label?: string
  children?: ReactNode
  active?: boolean
  color?: string
  onClick?: () => void
  className?: string
}

export default function Chip({ label, children, active = false, color, onClick, className = '' }: ChipProps) {
  const content = children ?? label
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
        active
          ? 'bg-orange text-white border-orange'
          : 'bg-elevated text-text-secondary border-border'
      } ${className}`}
      style={
        color && !active
          ? { borderColor: color + '55', color }
          : undefined
      }
    >
      {content}
    </button>
  )
}

