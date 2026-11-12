import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import TodayScreen from './screens/TodayScreen'
import TasksScreen from './screens/TasksScreen'
import BossModeScreen from './screens/BossModeScreen'
import AnalyticsScreen from './screens/AnalyticsScreen'
import ProfileScreen from './screens/ProfileScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import { useUserProfileStatus } from './db/hooks'

function BrandedSplash() {
  return (
    <div
      className="bg-black text-text-primary flex flex-col items-center justify-center gap-3"
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

function AppRoutes() {
  const status = useUserProfileStatus()

  if (status === undefined) {
    return <BrandedSplash />
  }

  const isCompleted = status.profile?.isOnboardingCompleted === true

  if (!isCompleted) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<TodayScreen />} />
      <Route path="/tasks" element={<TasksScreen />} />
      <Route path="/boss" element={<BossModeScreen />} />
      <Route path="/analytics" element={<AnalyticsScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <div
      className="bg-black text-text-primary font-sans overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  )
}
