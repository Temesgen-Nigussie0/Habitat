import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export default function Card({ children, className = '', onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-[28px] p-4 ${
        onClick ? 'cursor-pointer active:opacity-75 transition-opacity' : ''
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

