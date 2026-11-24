import { useEffect, useState } from 'react'
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { format } from 'date-fns'
import {
  getSupabaseClient,
  isSupabaseAuthConfigured,
  signInWithGoogle,
  signOutGoogle,
} from '../lib/supabaseClient'
import { getLastCloudSyncAt, syncWithSupabase } from '../lib/cloudSync'

interface CloudSyncCardProps {
  onNotify: (msg: string) => void
}

export default function CloudSyncCard({ onNotify }: CloudSyncCardProps) {
  const configured = isSupabaseAuthConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(() => getLastCloudSyncAt())

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data?.user ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (event === 'SIGNED_IN' && nextUser) {
        void (async () => {
          setIsSyncing(true)
          const res = await syncWithSupabase()
          setIsSyncing(false)
          if (res.ok && res.syncedAt) {
            setLastSync(res.syncedAt)
            onNotify('Google account connected & synced ✓')
          } else if (res.error) {
            onNotify(`Sync failed: ${res.error}`)
          }
        })()
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [onNotify])

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle()
    if (res.error) {
      onNotify(res.error)
    }
  }

  const handleManualSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    const res = await syncWithSupabase()
    setIsSyncing(false)
    if (res.ok && res.syncedAt) {
      setLastSync(res.syncedAt)
      onNotify('Cloud sync complete ✓')
    } else {
      onNotify(res.error || 'Could not sync right now')
    }
  }

  const handleSignOut = async () => {
    await signOutGoogle()
    setUser(null)
    onNotify('Signed out (local data kept safely on device)')
  }

  return (
    <div className="rounded-[20px] border border-[#242428] bg-[#161618] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-orange/15 text-orange">
            {configured ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#F5F5F7]">Cloud Sync</h3>
            <p className="text-[11px] text-[#8E8E93]">
              Sync habits, tasks &amp; streaks across devices
            </p>
          </div>
        </div>

        {user && (
          <span className="rounded-full bg-[#30D158]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#30D158]">
            Connected
          </span>
        )}
      </div>

      {!configured ? (
        <p className="mt-3 rounded-[12px] border border-[#242428] bg-[#0D0D0E] px-3 py-2.5 text-[11px] leading-relaxed text-[#8E8E93]">
          Add <code className="text-[#F5F5F7]">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-[#F5F5F7]">VITE_SUPABASE_ANON_KEY</code> to enable Google Cloud Sync.
        </p>
      ) : user ? (
        <div className="mt-3.5 space-y-3">
          <div className="flex items-center gap-3 rounded-[14px] border border-[#242428] bg-[#0D0D0E] p-3">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url as string}
                alt="Google avatar"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange/20 text-xs font-bold text-orange">
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#F5F5F7]">
                {(user.user_metadata?.full_name as string) || user.email}
              </p>
              <p className="truncate text-[11px] text-[#8E8E93]">
                {lastSync
                  ? `Last synced ${format(new Date(lastSync), 'MMM d, h:mm a')}`
                  : 'Ready to sync'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleManualSync()}
              disabled={isSyncing}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-orange text-[13px] font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border border-[#2C2C30] bg-[#0D0D0E] px-3.5 text-[12px] font-semibold text-[#A1A1AA] active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          className="mt-3.5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-white px-4 text-[14px] font-bold text-[#0D0D0E] shadow-md active:scale-[0.98] transition-transform"
        >
          {/* Crisp Official Google G SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}
    </div>
  )
}
