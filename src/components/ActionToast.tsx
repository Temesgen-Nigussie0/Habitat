import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame } from 'lucide-react'

export interface ActionToastData {
  title: string
  subtitle?: string | null
  variant?: 'task' | 'habit'
}

interface ActionToastProps {
  toast: ActionToastData | null
  onDismiss?: () => void
}

export default function ActionToast({ toast, onDismiss }: ActionToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.title + (toast.subtitle ?? '')}
          initial={{ opacity: 0, y: 28, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={onDismiss}
          className="fixed left-1/2 z-[65] -translate-x-1/2 w-max max-w-[90vw] cursor-pointer select-none"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
          }}
        >
          <div
            className="flex items-center gap-2.5 rounded-full border bg-[#16161C]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl"
            style={{
              borderColor: 'rgba(255,106,0,0.55)',
              boxShadow: '0 10px 30px -6px rgba(255,106,0,0.35)',
            }}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-sm shadow-[#FF6A00]/40">
              {toast.variant === 'habit' ? (
                <Flame size={14} fill="#FFFFFF" />
              ) : (
                <Check size={15} strokeWidth={3} />
              )}
            </div>
            <div className="min-w-0 pr-1">
              <p className="text-[13px] font-bold text-white leading-tight truncate">
                {toast.title}
              </p>
              {toast.subtitle && (
                <p className="text-[11px] font-medium text-[#FFB37B] leading-tight mt-0.5 truncate">
                  {toast.subtitle}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
