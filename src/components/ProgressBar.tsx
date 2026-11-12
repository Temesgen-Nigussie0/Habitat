interface ProgressBarProps {
  value: number    // 0–1
  className?: string
  color?: string
  trackColor?: string
  height?: number
}

export default function ProgressBar({
  value,
  className = '',
  color = '#FF6A00',
  trackColor = '#14141A',
  height = 6,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ height, backgroundColor: trackColor }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

