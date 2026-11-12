import { ReactNode } from 'react'

interface ProgressRingProps {
  value: number       // 0–1
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}

export default function ProgressRing({
  value,
  size = 48,
  strokeWidth = 3.5,
  color = '#FF6A00',
  trackColor = '#22222E',
  children,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * Math.max(0, Math.min(1, value))

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

