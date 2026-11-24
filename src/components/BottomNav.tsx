import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Flame, BarChart2, User, LogOut } from 'lucide-react'
import {
  getSupabaseClient,
  isSupabaseAuthConfigured,
  signOutGoogle,
} from '../lib/supabaseClient'

type TabDef = {
  icon: React.ComponentType<{ size: number; color?: string; strokeWidth?: number; className?: string }>
  label: string
  path: string
}

const tabs: (TabDef | null)[] = [
  { icon: Home, label: 'Today', path: '/' },
  { icon: ClipboardList, label: 'Tasks', path: '/tasks' },
  null, // center flame
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: User, label: 'Profile', path: '/profile' },
]

const desktopNavItems: Array<TabDef & { isBoss?: boolean }> = [
  { icon: Home, label: 'Today', path: '/' },
  { icon: ClipboardList, label: 'Tasks', path: '/tasks' },
  { icon: Flame, label: 'Boss Mode', path: '/boss', isBoss: true },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const u = data.session?.user
      setUserEmail(u?.email ?? null)
      setUserName(
        (u?.user_metadata?.full_name as string | undefined) ||
          (u?.user_metadata?.name as string | undefined) ||
          null
      )
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const u = session?.user
      setUserEmail(u?.email ?? null)
      setUserName(
        (u?.user_metadata?.full_name as string | undefined) ||
          (u?.user_metadata?.name as string | undefined) ||
          null
      )
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutGoogle()
    } finally {
      setSigningOut(false)
    }
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isBossActive = location.pathname === '/boss'

  return (
    <>
      {/* Mobile Floating Bottom Nav (< 768px) */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) - 18px), 6px)' }}
      >
        <nav
          className="pointer-events-auto flex items-center px-2 py-1.5 rounded-[34px] border border-border bg-elevated/95 backdrop-blur-md"
          style={{
            width: '92vw',
            maxWidth: 420,
            marginBottom: 4,
          }}
        >
          {tabs.map((tab) => {
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
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150"
                style={{ minHeight: 44 }}
              >
                <Icon
                  size={active ? 24 : 22}
                  color={active ? 'var(--color-orange, #FF6A00)' : '#6E6E7A'}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-active-dot"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="mt-0.5 h-1 w-4 rounded-full bg-orange"
                  />
                ) : (
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

      {/* Desktop Left Sidebar Rail (>= 768px) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[236px] flex-col justify-between border-r border-border bg-[#0B0B0F]/95 px-4 py-6 backdrop-blur-xl">
        <div>
          <div className="mb-8 flex items-center gap-3 px-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-orange/45 bg-orange/15"
              style={{ boxShadow: '0 0 20px rgba(var(--accent-rgb, 255, 106, 0), 0.2)' }}
            >
              <Flame size={20} color="var(--color-orange, #FF6A00)" fill="var(--color-orange, #FF6A00)" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight text-text-primary leading-none">
                Habitat
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                Habit OS
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {desktopNavItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`relative flex w-full min-h-[46px] items-center gap-3 rounded-[14px] px-3.5 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                    active
                      ? item.isBoss
                        ? 'bg-[#FF3B30]/15 text-[#FF453A] border border-[#FF3B30]/35'
                        : 'bg-orange/15 text-orange border border-orange/35'
                      : 'text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent'
                  }`}
                >
                  <Icon
                    size={19}
                    color={
                      active
                        ? item.isBoss
                          ? '#FF453A'
                          : 'var(--color-orange, #FF6A00)'
                        : '#8E8E93'
                    }
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rounded-[16px] border border-border bg-elevated/70 p-3.5 space-y-2.5">
          {userEmail ? (
            <>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-text-primary truncate">
                  {userName || 'Google Connected'}
                </p>
                <p className="mt-0.5 text-[11px] text-text-tertiary truncate">
                  {userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full h-9 rounded-[10px] border border-border bg-bg/70 hover:bg-bg hover:border-orange/40 text-text-secondary hover:text-text-primary text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <LogOut size={14} />
                <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold text-text-primary">Desktop Workspace</p>
                <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug">
                  Synced &amp; offline-ready across your devices.
                </p>
              </div>
              {isSupabaseAuthConfigured() && (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full h-8 rounded-[10px] bg-orange/15 hover:bg-orange/25 border border-orange/30 text-orange text-[11px] font-bold transition-colors"
                >
                  Connect Google
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
