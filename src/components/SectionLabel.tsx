import { ReactNode, CSSProperties } from 'react'

interface SectionLabelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function SectionLabel({ children, className = '', style }: SectionLabelProps) {
  return (
    <span
      className={`text-orange text-[11px] font-bold tracking-[0.12em] uppercase ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}

