import { Plus, RotateCcw } from 'lucide-react'

interface EmptyStateIllustrationProps {
  variant: 'habits' | 'tasks' | 'search'
  title: string
  subtitle: string
  ctaLabel?: string
  onAction?: () => void
}

export default function EmptyStateIllustration({
  variant,
  title,
  subtitle,
  ctaLabel,
  onAction,
}: EmptyStateIllustrationProps) {
  return (
    <div className="rounded-[24px] border border-[#242428] bg-[#161618] px-6 py-9 text-center">
      {/* Bespoke Dark-Mode Vector Illustration */}
      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center">
        {variant === 'habits' ? (
          <svg viewBox="0 0 96 96" className="h-24 w-24 overflow-visible" aria-hidden>
            <defs>
              <radialGradient id="habitOrb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-orange, #FF6A00)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-orange, #FF6A00)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="48" cy="48" r="44" fill="url(#habitOrb)" />
            <circle
              cx="48"
              cy="48"
              r="34"
              fill="none"
              stroke="#2C2C38"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <circle
              cx="48"
              cy="48"
              r="24"
              fill="#1B1B24"
              stroke="var(--color-orange, #FF6A00)"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
            <path
              d="M49 32C49 32 58 40 58 49C58 55.2 53.5 60 48 60C42.5 60 38 55.2 38 49C38 44.5 40.5 40.5 43.2 38.2C43 41.2 44.8 43 46.5 43C46.5 38.5 49 32 49 32Z"
              fill="var(--color-orange, #FF6A00)"
            />
            <circle cx="76" cy="24" r="3" fill="#FF9F0A" opacity="0.8" />
            <circle cx="20" cy="68" r="2.2" fill="#30D158" opacity="0.7" />
          </svg>
        ) : variant === 'tasks' ? (
          <svg viewBox="0 0 96 96" className="h-24 w-24 overflow-visible" aria-hidden>
            <defs>
              <radialGradient id="taskOrb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-orange, #FF6A00)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--color-orange, #FF6A00)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="48" cy="48" r="44" fill="url(#taskOrb)" />
            <rect
              x="24"
              y="22"
              width="48"
              height="52"
              rx="12"
              fill="#1B1B24"
              stroke="#2E2E3A"
              strokeWidth="1.5"
            />
            <path
              d="M34 38L38 42L46 34"
              fill="none"
              stroke="#30D158"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="51" y="36" width="13" height="4" rx="2" fill="#3A3A48" />
            <circle cx="38" cy="51" r="3.5" fill="none" stroke="var(--color-orange, #FF6A00)" strokeWidth="2" />
            <rect x="47" y="49" width="17" height="4" rx="2" fill="#3A3A48" />
            <circle cx="38" cy="62" r="3.5" fill="none" stroke="#4A4A58" strokeWidth="2" />
            <rect x="47" y="60" width="12" height="4" rx="2" fill="#2E2E3A" />
          </svg>
        ) : (
          <svg viewBox="0 0 96 96" className="h-24 w-24 overflow-visible" aria-hidden>
            <circle cx="45" cy="44" r="22" fill="#1B1B24" stroke="#2E2E3A" strokeWidth="2" />
            <circle
              cx="45"
              cy="44"
              r="14"
              fill="none"
              stroke="var(--color-orange, #FF6A00)"
              strokeOpacity="0.5"
              strokeWidth="2"
            />
            <line
              x1="60"
              y1="60"
              x2="74"
              y2="74"
              stroke="var(--color-orange, #FF6A00)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <p className="text-[16px] font-bold text-text-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-relaxed text-text-secondary">
        {subtitle}
      </p>

      {ctaLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-orange px-5 text-[13px] font-bold text-white shadow-lg shadow-orange/25 active:scale-95 transition-transform"
        >
          {variant === 'search' ? <RotateCcw size={15} /> : <Plus size={16} strokeWidth={2.5} />}
          <span>{ctaLabel}</span>
        </button>
      )}
    </div>
  )
}
