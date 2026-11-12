import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  CheckSquare,
  Code,
  Film,
  Flame,
  GraduationCap,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  dismissBackupNudgeFor7Days,
  exportBackup,
  shouldShowBackupNudge,
} from '../lib/backup'
import Screen from '../components/Screen'
import ProgressBar from '../components/ProgressBar'
import StreakHeatmap from '../components/StreakHeatmap'
import PillarRadarMatrix from '../components/PillarRadarMatrix'
import StreakFreezeProtocolCard from '../components/StreakFreezeProtocolCard'
import MilestoneBadgesSection from '../components/MilestoneBadgesSection'
import SmartSchedulerCard from '../components/SmartSchedulerCard'
import {
  useActiveBossChallenge,
  useAllEntries,
  useHabits,
  useStreakFreezes,
  useTasks,
  useUserProfile,
} from '../db/hooks'
import {
  activateStreakFreeze,
  setComebackProtocolActive,
  updateSmartSchedule,
} from '../db/actions'
import {
  getHabitConsistencyRate7Days,
  getHeatmapData,
  getMilestoneBadges,
  getPillarScores,
  getProductionDomains,
  getSmartHabitSuggestions,
  getTaskCompletionStats,
  getTotalActionsCount,
} from '../lib/analytics'
import { getTodayLocal } from '../lib/streak'

function getDomainIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('code') || lower.includes('software') || lower.includes('dev')) {
    return Code
  }
  if (lower.includes('video') || lower.includes('photo') || lower.includes('design')) {
    return Film
  }
  if (lower.includes('academic') || lower.includes('university') || lower.includes('study')) {
    return GraduationCap
  }
  return Briefcase
}

export default function AnalyticsScreen() {
  const habits = useHabits()
  const entries = useAllEntries()
  const tasks = useTasks()
  const profile = useUserProfile()
  const activeBossChallenge = useActiveBossChallenge()
  const streakFreezes = useStreakFreezes()

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  useEffect(() => {
    if (!toastMsg) return
    const t = window.setTimeout(() => setToastMsg(null), 3500)
    return () => window.clearTimeout(t)
  }, [toastMsg])

  const isLoading =
    habits === undefined || entries === undefined || tasks === undefined

  const habitList = habits ?? []
  const entryList = entries ?? []
  const taskList = tasks ?? []
  const todayStr = getTodayLocal()

  const habitRate = useMemo(
    () => getHabitConsistencyRate7Days(habitList, entryList, todayStr),
    [habitList, entryList, todayStr]
  )

  const taskStats = useMemo(
    () => getTaskCompletionStats(taskList),
    [taskList]
  )

  const totalActions = useMemo(
    () => getTotalActionsCount(entryList, taskList),
    [entryList, taskList]
  )

  const heatmapData = useMemo(
    () => getHeatmapData(entryList, taskList, 18, todayStr),
    [entryList, taskList, todayStr]
  )

  const pillarScores = useMemo(
    () => getPillarScores(habitList, entryList, taskList, todayStr),
    [habitList, entryList, taskList, todayStr]
  )

  const domains = useMemo(
    () => getProductionDomains(taskList, habitList, entryList, todayStr),
    [taskList, habitList, entryList, todayStr]
  )

  const badges = useMemo(
    () => getMilestoneBadges(habitList, entryList, activeBossChallenge),
    [habitList, entryList, activeBossChallenge]
  )

  const savedTimesMap = useMemo(() => {
    try {
      return profile?.smartScheduleTimes
        ? (JSON.parse(profile.smartScheduleTimes) as Record<number, string>)
        : {}
    } catch {
      return {}
    }
  }, [profile?.smartScheduleTimes])

  const smartSuggestions = useMemo(
    () => getSmartHabitSuggestions(habitList, savedTimesMap),
    [habitList, savedTimesMap]
  )

  const isTodayFrozen = useMemo(
    () => (streakFreezes ?? []).some((f) => f.date === todayStr),
    [streakFreezes, todayStr]
  )

  return (
    <Screen className="pb-28">
      {/* In-app Toast for Notification Test Lab */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 w-[90%] max-w-[390px] -translate-x-1/2 rounded-[16px] border border-[#FF6A00]/60 bg-[#1C1C20] px-4 py-3 text-[12px] font-semibold leading-snug text-[#F5F5F7] shadow-2xl">
          {toastMsg}
        </div>
      )}

      {/* 1. Header */}
      <div className="pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
          PERFORMANCE ANALYTICS
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold text-[#F5F5F7]">
          Productivity Matrix
        </h1>
      </div>

      {/* Gentle Backup Nudge */}
      {!isLoading &&
        !nudgeDismissed &&
        shouldShowBackupNudge(
          profile,
          entryList.filter((e) => e.isCompleted).length
        ) && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-[14px] border border-[#FF9F0A]/45 bg-[#FF9F0A]/10 px-3.5 py-2">
            <span className="text-[12px] font-semibold text-[#F5F5F7]">
              Back up your data
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void exportBackup().then(() =>
                    setToastMsg('Backup exported successfully')
                  )
                }}
                className="min-h-[34px] rounded-[8px] bg-[#FF6A00] px-2.5 text-[11px] font-bold text-white"
              >
                Export
              </button>
              <button
                type="button"
                aria-label="Dismiss backup nudge"
                onClick={() => {
                  dismissBackupNudgeFor7Days()
                  setNudgeDismissed(true)
                }}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[#8E8E93]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-4 animate-pulse">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="h-24 rounded-[18px] bg-[#161618]" />
            <div className="h-24 rounded-[18px] bg-[#161618]" />
            <div className="h-24 rounded-[18px] bg-[#161618]" />
          </div>
          <div className="h-44 rounded-[22px] bg-[#161618]" />
          <div className="h-64 rounded-[22px] bg-[#161618]" />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {/* 2. Three Equal Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[18px] border border-[#242428] bg-[#161618] p-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#FF6A00]" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  HABIT RATE
                </span>
              </div>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-[#F5F5F7]">
                {habitRate}%
              </p>
              <p className="mt-1.5 text-[10px] text-[#8E8E93]">Past 7 days</p>
            </div>

            <div className="rounded-[18px] border border-[#242428] bg-[#161618] p-3">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-[#30D158]" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  TASKS DONE
                </span>
              </div>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-[#F5F5F7]">
                {taskStats.pct}%
              </p>
              <p className="mt-1.5 text-[10px] text-[#8E8E93]">
                {taskStats.done} / {taskStats.total} done
              </p>
            </div>

            <div className="rounded-[18px] border border-[#242428] bg-[#161618] p-3">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[#FF9F0A]" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  ACTIONS
                </span>
              </div>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-[#F5F5F7]">
                {totalActions}
              </p>
              <p className="mt-1.5 text-[10px] text-[#8E8E93]">Total logged</p>
            </div>
          </div>

          {/* 3. Heatmap Card */}
          <StreakHeatmap data={heatmapData} />

          {/* 4. Pillar Balance Matrix */}
          <PillarRadarMatrix scores={pillarScores} />

          {/* 5. Production Domains */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
              PRODUCTION DOMAINS
            </p>
            <div className="mt-2.5 rounded-[20px] border border-[#242428] bg-[#161618] p-[18px]">
              {domains.taskDomains.length === 0 && !domains.dailyHabits ? (
                <p className="text-[12px] leading-relaxed text-[#A1A1AA]">
                  No production domains yet. Create tasks and habits to see
                  real-time domain velocity.
                </p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {domains.taskDomains.map((row) => {
                    const Icon = getDomainIcon(row.name)
                    return (
                      <div key={row.name}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon
                              className="h-4 w-4 shrink-0"
                              style={{ color: row.color }}
                            />
                            <span className="truncate text-[13px] font-semibold text-[#F5F5F7]">
                              {row.name}
                            </span>
                          </div>
                          <span className="shrink-0 text-[11px] font-medium text-[#A1A1AA]">
                            {row.done} / {row.total} done ({row.pct}%)
                          </span>
                        </div>
                        <ProgressBar value={row.pct} color={row.color} />
                      </div>
                    )
                  })}

                  {domains.dailyHabits && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Flame className="h-4 w-4 shrink-0 text-[#30D158]" />
                          <span className="truncate text-[13px] font-semibold text-[#F5F5F7]">
                            Daily Lifestyle Habits
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] font-medium text-[#A1A1AA]">
                          {domains.dailyHabits.completedToday} /{' '}
                          {domains.dailyHabits.scheduledToday} completed today
                        </span>
                      </div>
                      <ProgressBar
                        value={domains.dailyHabits.pct}
                        color="#30D158"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Streak Freeze Vault */}
          <StreakFreezeProtocolCard
            profile={profile}
            isTodayFrozen={isTodayFrozen}
            onActivateFreeze={() => {
              void activateStreakFreeze()
            }}
            onToggleComeback={(active) => {
              void setComebackProtocolActive(active)
            }}
          />

          {/* 7. Milestone Badges */}
          <MilestoneBadgesSection badges={badges} />

          {/* 8. Smart Habit Scheduler */}
          <SmartSchedulerCard
            suggestions={smartSuggestions}
            enabled={profile?.smartSchedulerEnabled ?? true}
            onSaveSchedule={async (enabled, map) => {
              await updateSmartSchedule(enabled, map)
            }}
            onTriggerTestToast={(msg) => setToastMsg(msg)}
            habitsCount={habitList.length}
          />
        </div>
      )}
    </Screen>
  )
}
