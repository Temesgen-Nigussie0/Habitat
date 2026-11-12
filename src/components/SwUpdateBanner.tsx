import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export default function SwUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      }}
    >
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#FF6A00]/60 bg-[#161618] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] shadow-2xl active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5 text-[#FF6A00]" />
        <span>New version ready · Tap to update</span>
      </button>
    </div>
  )
}

