import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle, Flame } from 'lucide-react'
import TodayScreen from './screens/TodayScreen'
import TasksScreen from './screens/TasksScreen'
import BossModeScreen from './screens/BossModeScreen'
import AnalyticsScreen from './screens/AnalyticsScreen'
import ProfileScreen from './screens/ProfileScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ScreenErrorBoundary from './components/ScreenErrorBoundary'
import SwUpdateBanner from './components/SwUpdateBanner'
import { useUserProfileStatus } from './db/hooks'
import { db } from './db/db'

function BrandedSplash() {
  return (
    <div
      className="bg-[#070709] text-text-primary flex flex-col items-center justify-center gap-3"
      style={{ height: '100dvh' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: 'rgba(255,106,0,0.14)',
          borderColor: 'rgba(255,106,0,0.45)',
        }}
      >
        <Flame size={32} color="#FF6A00" fill="#FF6A00" />
      </div>
      <span className="text-lg font-bold tracking-tight text-text-primary">Habitat</span>
    </div>
  )
}

function StorageBlockedNotice() {
  return (
    <div
      className="flex items-center justify-center bg-[#070709] px-5"
      style={{ height: '100dvh' }}
    >
      <div className="w-full max-w-[360px] rounded-[24px] border border-[#242428] bg-[#161618] p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-[18px] font-bold text-[#F5F5F7]">
          Local Storage Unavailable
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#A1A1AA]">
          Habitat stores your habits and tasks offline in IndexedDB. Please turn
          off Private Browsing or allow site storage in Safari Settings, then
          reload.
        </p>
      </div>
    </div>
  )
}

function withBoundary(key: string, node: ReactNode) {
  return <ScreenErrorBoundary key={key}>{node}</ScreenErrorBoundary>
}

function AppRoutes() {
  const status = useUserProfileStatus()

  if (status === undefined) {
    return <BrandedSplash />
  }

  const isCompleted = status.profile?.isOnboardingCompleted === true

  if (!isCompleted) {
    return (
      <Routes>
        <Route
          path="/onboarding"
          element={withBoundary('onboarding', <OnboardingScreen />)}
        />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={withBoundary('today', <TodayScreen />)} />
      <Route path="/tasks" element={withBoundary('tasks', <TasksScreen />)} />
      <Route path="/boss" element={withBoundary('boss', <BossModeScreen />)} />
      <Route
        path="/analytics"
        element={withBoundary('analytics', <AnalyticsScreen />)}
      />
      <Route
        path="/profile"
        element={withBoundary('profile', <ProfileScreen />)}
      />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [storageBlocked, setStorageBlocked] = useState(false)

  useEffect(() => {
    let active = true
    if (typeof indexedDB === 'undefined') {
      setStorageBlocked(true)
      return
    }
    db.open().catch(() => {
      if (active) setStorageBlocked(true)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div
      className="bg-[#070709] text-text-primary font-sans overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {storageBlocked ? (
        <StorageBlockedNotice />
      ) : (
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      )}
      <SwUpdateBanner />
    </div>
  )
}
