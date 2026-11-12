import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  Brain,
  Camera,
  Code,
  Film,
  Flame,
  Gauge,
  GraduationCap,
  Pencil,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react'
import Screen from '../components/Screen'
import StreakFreezeProtocolCard from '../components/StreakFreezeProtocolCard'
import QuickHabitsLibrary, {
  type CuratedQuickHabit,
} from '../components/QuickHabitsLibrary'
import DataBackupSection from '../components/DataBackupSection'
import EditBioSheet from '../components/EditBioSheet'
import ImageAdjustmentDialog from '../components/ImageAdjustmentDialog'
import {
  useAllEntries,
  useAllHabits,
  useHabits,
  useStreakFreezes,
  useTasks,
  useUserProfile,
} from '../db/hooks'
import {
  activateStreakFreeze,
  addQuickHabitIfNew,
  retakeOnboarding,
  setComebackProtocolActive,
  upsertUserProfile,
} from '../db/actions'
import {
  dismissBackupNudgeFor7Days,
  shouldShowBackupNudge,
} from '../lib/backup'
import { getTodayLocal } from '../lib/streak'
import pkg from '../../package.json'

function getOccupationIcon(occ: string) {
  const lower = occ.toLowerCase()
  if (
    lower.includes('code') ||
    lower.includes('computer') ||
    lower.includes('software') ||
    lower.includes('dev')
  ) {
    return Code
  }
  if (
    lower.includes('video') ||
    lower.includes('photo') ||
    lower.includes('visual') ||
    lower.includes('creator')
  ) {
    return Film
  }
  if (
    lower.includes('student') ||
    lower.includes('academic') ||
    lower.includes('school') ||
    lower.includes('science')
  ) {
    return GraduationCap
  }
  return Flame
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const profile = useUserProfile()
  const activeHabits = useHabits()
  const allHabits = useAllHabits()
  const allEntries = useAllEntries()
  const tasks = useTasks()
  const streakFreezes = useStreakFreezes()

  const [editBioOpen, setEditBioOpen] = useState(false)
  const [retakeConfirmOpen, setRetakeConfirmOpen] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [cropState, setCropState] = useState<{
    src: string
    mode: 'avatar' | 'banner'
  } | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!toastMsg) return
    const t = window.setTimeout(() => setToastMsg(null), 2800)
    return () => window.clearTimeout(t)
  }, [toastMsg])

  const occupations = useMemo(() => {
    const raw =
      profile?.occupations ||
      'Computer Science, Client Freelancer, Visual Creator'
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [profile?.occupations])

  const habitsCount = (activeHabits ?? []).length
  const totalTasksCount = (tasks ?? []).length
  const completedTasksCount = (tasks ?? []).filter((t) => t.isCompleted).length
  const todayStr = getTodayLocal()
  const isTodayFrozen = (streakFreezes ?? []).some((f) => f.date === todayStr)

  const handleImagePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'avatar' | 'banner'
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropState({ src: reader.result, mode })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleQuickAddHabit = async (habitDef: CuratedQuickHabit) => {
    const added = await addQuickHabitIfNew({
      name: habitDef.name,
      category: habitDef.category,
      iconName: habitDef.iconName,
      colorHex: habitDef.colorHex,
      targetCount: habitDef.targetCount,
      unit: habitDef.unit,
      timeOfDay: habitDef.timeOfDay,
      frequency: 'DAILY',
      customDays: '',
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      createdAt: Date.now(),
      isArchived: false,
    })
    if (added) {
      setToastMsg(`Added "${habitDef.name}" to Today`)
    }
  }

  const handleConfirmRetake = async () => {
    await retakeOnboarding()
    setRetakeConfirmOpen(false)
    navigate('/onboarding')
  }

  const blueprintRows = [
    {
      label: 'Primary Focus Area',
      value: profile?.focusArea || 'Physical Vitality',
      Icon: Zap,
    },
    {
      label: 'Baseline Consistency',
      value: profile?.currentConsistency || 'Starting fresh',
      Icon: Gauge,
    },
    {
      label: 'Streak Safeguard',
      value: profile?.frictionHurdle || 'Motivation drops',
      Icon: Brain,
    },
    {
      label: 'Prime Time Window',
      value: profile?.primeZone || 'Early Morning (6:00 - 9:00 AM)',
      Icon: Sparkles,
    },
    {
      label: 'Daily Prompt',
      value: profile?.briefingTime || '07:30 AM',
      Icon: AlarmClock,
    },
  ]

  return (
    <Screen className="pb-28">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#FF6A00]/60 bg-[#1C1C20] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* 1. Banner Image */}
      <div className="relative h-[170px] w-full overflow-hidden bg-[#161618]">
        <img
          src={profile?.bannerUri || '/profile_banner_default.jpg'}
          alt="Profile Banner"
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 60%, #0D0D0E 100%)',
          }}
        />
        <button
          type="button"
          aria-label="Change Banner"
          onClick={() => bannerInputRef.current?.click()}
          className="absolute right-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white active:scale-95"
        >
          <Camera className="h-4 w-4" />
        </button>

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImagePick(e, 'banner')}
          className="hidden"
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImagePick(e, 'avatar')}
          className="hidden"
        />
      </div>

      {/* Main Content Container */}
      <div className="px-4">
        {/* Overlapping Avatar + Edit Bio */}
        <div className="-mt-[42px] flex items-end justify-between">
          <button
            type="button"
            aria-label="Change Profile Photo"
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#FF6A00] bg-[#161618] active:scale-95"
          >
            {profile?.avatarUri ? (
              <img
                src={profile.avatarUri}
                alt="Profile Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <Camera className="h-6 w-6 text-[#FF6A00]" />
                <span className="mt-0.5 text-[10px] font-bold text-[#A1A1AA]">
                  Add Photo
                </span>
              </div>
            )}

            <span className="absolute bottom-0.5 right-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#0D0D0E] bg-[#FF6A00]">
              <Camera className="h-3 w-3 text-white" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEditBioOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[12px] border border-[#242428] bg-[#161618] px-3.5 text-[12px] font-semibold text-[#F5F5F7] active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5 text-[#FF6A00]" />
            Edit Bio
          </button>
        </div>

        {/* 2. Name, Headline, Bio, Occupations */}
        <div className="mt-3">
          <h1 className="text-[22px] font-bold text-[#F5F5F7]">
            {profile?.userName?.trim() || 'Alex'}
          </h1>
          <p className="mt-0.5 text-[13px] font-medium text-[#FF6A00]">
            {profile?.headline || 'CS Student & Visual Creator'}
          </p>
          {profile?.bio && (
            <p className="mt-1.5 text-[12px] leading-[17px] text-[#A1A1AA]">
              {profile.bio}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2">
            {occupations.map((occ) => {
              const Icon = getOccupationIcon(occ)
              return (
                <span
                  key={occ}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#242428] bg-[#161618] px-2.5 py-1 text-[11px] font-medium text-[#F5F5F7]"
                >
                  <Icon className="h-3 w-3 text-[#FF6A00]" />
                  {occ}
                </span>
              )
            })}
          </div>
        </div>

        {/* 3. Three Stat Pills */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-[14px] border border-[#242428] bg-[#161618] p-2.5">
            <p className="text-[9px] font-bold uppercase text-[#8E8E93]">
              HABITS
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#FF6A00]">
              {habitsCount} active
            </p>
          </div>

          <div className="rounded-[14px] border border-[#242428] bg-[#161618] p-2.5">
            <p className="text-[9px] font-bold uppercase text-[#8E8E93]">
              TASKS DONE
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#30D158]">
              {completedTasksCount} / {totalTasksCount}
            </p>
          </div>

          <div className="rounded-[14px] border border-[#242428] bg-[#161618] p-2.5">
            <p className="text-[9px] font-bold uppercase text-[#8E8E93]">
              STATUS
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#0A84FF]">
              High Velocity
            </p>
          </div>
        </div>

        {/* 4. Lifestyle Blueprint */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
            LIFESTYLE BLUEPRINT
          </p>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {blueprintRows.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3.5 rounded-[16px] border border-[#242428] bg-[#161618] p-3.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0D0D0E]">
                  <Icon className="h-[18px] w-[18px] text-[#FF6A00]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#8E8E93]">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] font-semibold text-[#F5F5F7]">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Streak Preservation & Resilience */}
        <div className="mt-6">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
            STREAK PRESERVATION &amp; RESILIENCE
          </p>
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
        </div>

        {/* 6. Quick Habit Library */}
        <div className="mt-6">
          <QuickHabitsLibrary
            allHabits={allHabits ?? []}
            onAddHabit={handleQuickAddHabit}
          />
        </div>

        {/* 7. Retake 10-Question Onboarding */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setRetakeConfirmOpen(true)}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#242428] bg-[#161618] text-[14px] font-semibold text-[#F5F5F7] active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4 text-[#FF6A00]" />
            Retake 10-Question Onboarding
          </button>
        </div>

        {/* 8. Your Data (Backup Export / Import / Erase) */}
        <div className="mt-6">
          <DataBackupSection
            lastExportedAt={profile?.lastExportedAt}
            showNudge={
              !nudgeDismissed &&
              shouldShowBackupNudge(
                profile,
                (allEntries ?? []).filter((e) => e.isCompleted).length
              )
            }
            onDismissNudge={() => {
              dismissBackupNudgeFor7Days()
              setNudgeDismissed(true)
            }}
            onNotify={(msg) => setToastMsg(msg)}
          />
        </div>

        {/* 9. About Habitat */}
        <div className="mt-6 pb-4 text-center">
          <p className="text-[12px] font-semibold text-[#8E8E93]">
            About Habitat · v{pkg.version}
          </p>
          <p className="mt-0.5 text-[11px] text-[#6E6E7A]">
            Your data stays on this phone.
          </p>
        </div>
      </div>

      {/* Edit Bio Sheet */}
      <EditBioSheet
        isOpen={editBioOpen}
        initialName={profile?.userName || 'Alex'}
        initialHeadline={profile?.headline || 'Creator & Habit Architect'}
        initialOccupations={
          profile?.occupations ||
          'Computer Science, Client Freelancer, Visual Creator'
        }
        initialBio={profile?.bio || ''}
        onClose={() => setEditBioOpen(false)}
        onSave={async (userName, headline, bio, occs) => {
          await upsertUserProfile({ userName, headline, bio, occupations: occs })
        }}
      />

      {/* Image Adjustment Dialog */}
      <ImageAdjustmentDialog
        imageSrc={cropState?.src ?? null}
        mode={cropState?.mode ?? 'avatar'}
        onClose={() => setCropState(null)}
        onConfirm={async (dataUrl) => {
          if (!cropState) return
          if (cropState.mode === 'avatar') {
            await upsertUserProfile({ avatarUri: dataUrl })
          } else {
            await upsertUserProfile({ bannerUri: dataUrl })
          }
        }}
      />

      {/* Retake Onboarding Confirm Modal */}
      {retakeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setRetakeConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[360px] rounded-[24px] border border-[#2C2C30] bg-[#161618] p-5 shadow-2xl">
            <h3 className="text-[17px] font-bold text-[#F5F5F7]">
              Retake 10-Question Onboarding?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#A1A1AA]">
              Your existing habits, tasks, and completion history will be kept.
              Only your onboarding profile answers will be updated.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setRetakeConfirmOpen(false)}
                className="min-h-[44px] flex-1 rounded-[12px] border border-[#2C2C30] bg-[#0D0D0E] text-[13px] font-semibold text-[#A1A1AA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRetake}
                className="min-h-[44px] flex-1 rounded-[12px] bg-[#FF6A00] text-[13px] font-bold text-white"
              >
                Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
