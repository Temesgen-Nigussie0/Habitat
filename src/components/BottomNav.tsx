import { useLocation, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, Flame, BarChart2, User } from 'lucide-react'

type TabDef = { icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>, label: string; path: string }

const tabs: (TabDef | null)[] = [
  { icon: Home, label: 'Today', path: '/' },
  { icon: ClipboardList, label: 'Tasks', path: '/tasks' },
  null, // center flame
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isBossActive = location.pathname === '/boss'

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) - 18px), 6px)' }}
    >
      <nav
        className="pointer-events-auto flex items-center px-2 py-1.5 rounded-[34px] border border-border bg-elevated"
        style={{
          width: '92vw',
          maxWidth: 420,
          marginBottom: 4,
        }}
      >
        {tabs.map((tab, i) => {
          if (tab === null) {
            return (
              <div key="boss" className="flex flex-1 justify-center">
                <button
                  onClick={() => navigate('/boss')}
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(to bottom, #FF3B30, #E65100)',
                    boxShadow: isBossActive
                      ? '0 0 20px rgba(255,59,48,0.5)'
                      : '0 4px 16px rgba(255,59,48,0.35)',
                  }}
                  aria-label="Boss Mode"
                >
                  <Flame size={25} color="white" fill="white" />
                </button>
              </div>
            )
          }
          const Icon = tab.icon
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity"
              style={{ minHeight: 44 }}
            >
              <Icon
                size={active ? 24 : 22}
                color={active ? '#FF6A00' : '#6E6E7A'}
                strokeWidth={active ? 2.4 : 1.8}
              />
              {!active && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: '#6E6E7A' }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

