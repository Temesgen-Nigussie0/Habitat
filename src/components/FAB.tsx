import { Plus } from 'lucide-react'

interface FABProps {
  onClick?: () => void
  'aria-label'?: string
}

export default function FAB({ onClick, 'aria-label': ariaLabel = 'Add new' }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-5 z-40 w-14 h-14 rounded-full bg-orange flex items-center justify-center active:scale-95 transition-transform"
      style={{
        bottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 90px)',
        boxShadow: '0 4px 20px rgba(255,106,0,0.45)',
      }}
      aria-label={ariaLabel}
    >
      <Plus size={28} color="white" strokeWidth={2.5} />
    </button>
  )
}

