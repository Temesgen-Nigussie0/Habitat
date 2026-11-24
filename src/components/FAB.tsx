import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface FABProps {
  onClick?: () => void
  'aria-label'?: string
  layoutId?: string
}

export default function FAB({
  onClick,
  'aria-label': ariaLabel = 'Add new',
  layoutId = 'fab-morph-surface',
}: FABProps) {
  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="fixed right-5 md:right-8 bottom-[calc(max(calc(env(safe-area-inset-bottom)-18px),6px)+78px)] md:bottom-8 z-40 w-14 h-14 rounded-full bg-orange flex items-center justify-center shadow-lg shadow-orange/40"
      aria-label={ariaLabel}
    >
      <Plus size={28} color="white" strokeWidth={2.5} />
    </motion.button>
  )
}
