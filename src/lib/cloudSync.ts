// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Multi-Device Cloud Sync Engine (Google Auth + Supabase JSONB)
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db/db'
import type {
  BossChallenge,
  Habit,
  HabitEntry,
  StreakFreeze,
  Task,
  UserProfile,
} from '../db/types'
import { recalculateAllHabitStreaks } from '../db/actions'
import { getVisitedDates } from './streak'
import { applyAccentTheme, getSelectedAccentTheme, selectAndApplyAccentTheme } from './accentTheme'
import { getSupabaseClient } from './supabaseClient'

export interface HabitatCloudSnapshot {
  version: 1
  updatedAt: number
  userProfile: UserProfile | null
  habits: Habit[]
  habitEntries: Array<HabitEntry & { habitName?: string }>
  tasks: Task[]
  bossChallenges: BossChallenge[]
  streakFreezes: StreakFreeze[]
  visitedDates: string[]
  appStartDate: string | null
  accentThemeId: string
}

const LAST_SYNC_KEY = 'habitat_last_cloud_sync'

export function getLastCloudSyncAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(LAST_SYNC_KEY)
  const num = raw ? Number(raw) : NaN
  return Number.isFinite(num) ? num : null
}

function setLastCloudSyncAt(ts: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(ts))
  } catch {
    // ignore
  }
}

export async function buildLocalSnapshot(): Promise<HabitatCloudSnapshot> {
  const [userProfile, habits, habitEntries, tasks, bossChallenges, streakFreezes] =
    await Promise.all([
      db.userProfile.get(1),
      db.habits.toArray(),
      db.habitEntries.toArray(),
      db.tasks.toArray(),
      db.bossChallenges.toArray(),
      db.streakFreezes.toArray(),
    ])

  const habitNameById = new Map<number, string>()
  for (const h of habits) {
    if (h.id !== undefined) habitNameById.set(h.id, h.name)
  }

  return {
    version: 1,
    updatedAt: Date.now(),
    userProfile: userProfile ?? null,
    habits,
    habitEntries: habitEntries.map((e) => ({
      ...e,
      habitName: habitNameById.get(e.habitId),
    })),
    tasks,
    bossChallenges,
    streakFreezes,
    visitedDates: getVisitedDates(),
    appStartDate:
      typeof window !== 'undefined'
        ? localStorage.getItem('habitat_app_start_date')
        : null,
    accentThemeId: getSelectedAccentTheme().id,
  }
}

/**
 * Pure deterministic merge between local and remote snapshots so connecting
 * a new device or existing account never loses habits, tasks, or completions.
 */
export function mergeSnapshots(
  local: HabitatCloudSnapshot,
  remote: HabitatCloudSnapshot
): HabitatCloudSnapshot {
  const newerIsRemote = remote.updatedAt > local.updatedAt

  // 1. Merge habits by normalized name
  const habitMap = new Map<string, Habit>()
  for (const h of local.habits) {
    habitMap.set(h.name.trim().toLowerCase(), { ...h })
  }
  for (const rh of remote.habits) {
    const key = rh.name.trim().toLowerCase()
    const lh = habitMap.get(key)
    if (!lh) {
      habitMap.set(key, { ...rh, id: undefined })
    } else {
      habitMap.set(key, {
        ...(newerIsRemote ? rh : lh),
        id: lh.id,
        bestStreak: Math.max(lh.bestStreak || 0, rh.bestStreak || 0),
        currentStreak: Math.max(lh.currentStreak || 0, rh.currentStreak || 0),
        isArchived: newerIsRemote ? rh.isArchived : lh.isArchived,
      })
    }
  }
  const mergedHabits = [...habitMap.values()]

  // 2. Merge entries by (habitName|date)
  const localHabitNameById = new Map(
    local.habits.filter((h) => h.id !== undefined).map((h) => [h.id!, h.name])
  )
  const remoteHabitNameById = new Map(
    remote.habits.filter((h) => h.id !== undefined).map((h) => [h.id!, h.name])
  )

  const entryMap = new Map<string, HabitEntry & { habitName?: string }>()
  for (const e of local.habitEntries) {
    const hName = e.habitName || localHabitNameById.get(e.habitId) || String(e.habitId)
    const key = `${hName.trim().toLowerCase()}|${e.date}`
    entryMap.set(key, { ...e, habitName: hName })
  }
  for (const re of remote.habitEntries) {
    const hName = re.habitName || remoteHabitNameById.get(re.habitId) || String(re.habitId)
    const key = `${hName.trim().toLowerCase()}|${re.date}`
    const le = entryMap.get(key)
    if (!le) {
      entryMap.set(key, { ...re, id: undefined, habitName: hName })
    } else {
      const pickRemote =
        (re.isCompleted && !le.isCompleted) ||
        re.currentCount > le.currentCount ||
        (re.completedAt > le.completedAt && re.isCompleted === le.isCompleted)
      entryMap.set(key, {
        ...(pickRemote ? re : le),
        id: le.id,
        habitName: hName,
      })
    }
  }

  // 3. Merge tasks by (normalized title + createdAt)
  const taskMap = new Map<string, Task>()
  for (const t of local.tasks) {
    const key = `${t.title.trim().toLowerCase()}|${t.createdAt}`
    taskMap.set(key, { ...t })
  }
  for (const rt of remote.tasks) {
    const key = `${rt.title.trim().toLowerCase()}|${rt.createdAt}`
    const lt = taskMap.get(key)
    if (!lt) {
      taskMap.set(key, { ...rt, id: undefined })
    } else {
      const pickRemote =
        (rt.isCompleted && !lt.isCompleted) || newerIsRemote
      taskMap.set(key, { ...(pickRemote ? rt : lt), id: lt.id })
    }
  }

  // 4. Merge streak freezes by date
  const freezeMap = new Map<string, StreakFreeze>()
  for (const f of [...local.streakFreezes, ...remote.streakFreezes]) {
    if (!freezeMap.has(f.date)) {
      freezeMap.set(f.date, { ...f, id: undefined })
    }
  }

  // 5. Merge visitedDates & appStartDate
  const visitedSet = new Set([...local.visitedDates, ...remote.visitedDates])
  const startCandidates = [local.appStartDate, remote.appStartDate].filter(
    (d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d))
  ).sort()

  // 6. Merge profile
  const mergedProfile: UserProfile | null =
    local.userProfile && remote.userProfile
      ? {
          ...(newerIsRemote ? remote.userProfile : local.userProfile),
          id: 1,
          isOnboardingCompleted:
            local.userProfile.isOnboardingCompleted ||
            remote.userProfile.isOnboardingCompleted,
          joinedAt: Math.min(
            local.userProfile.joinedAt || Date.now(),
            remote.userProfile.joinedAt || Date.now()
          ),
        }
      : local.userProfile || remote.userProfile

  return {
    version: 1,
    updatedAt: Date.now(),
    userProfile: mergedProfile,
    habits: mergedHabits,
    habitEntries: [...entryMap.values()],
    tasks: [...taskMap.values()],
    bossChallenges:
      newerIsRemote && remote.bossChallenges.length > 0
        ? remote.bossChallenges
        : local.bossChallenges.length > 0
          ? local.bossChallenges
          : remote.bossChallenges,
    streakFreezes: [...freezeMap.values()],
    visitedDates: [...visitedSet].sort(),
    appStartDate: startCandidates[0] ?? null,
    accentThemeId: newerIsRemote ? remote.accentThemeId : local.accentThemeId,
  }
}

async function applyMergedSnapshotToLocal(merged: HabitatCloudSnapshot): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.userProfile,
      db.habits,
      db.habitEntries,
      db.tasks,
      db.bossChallenges,
      db.streakFreezes,
    ],
    async () => {
      if (merged.userProfile) {
        await db.userProfile.put({ ...merged.userProfile, id: 1 })
      }

      // Re-insert habits cleanly and build fresh name -> id map
      await db.habits.clear()
      const nameToId = new Map<string, number>()
      for (const h of merged.habits) {
        const clean: Omit<Habit, 'id'> = { ...h }
        delete (clean as Partial<Habit>).id
        const newId = (await db.habits.add(clean as Habit)) as number
        nameToId.set(h.name.trim().toLowerCase(), newId)
      }

      await db.habitEntries.clear()
      for (const e of merged.habitEntries) {
        const key = (e.habitName || '').trim().toLowerCase()
        const mappedHabitId = nameToId.get(key)
        if (!mappedHabitId) continue
        await db.habitEntries.add({
          habitId: mappedHabitId,
          date: e.date,
          currentCount: e.currentCount,
          targetCount: e.targetCount,
          isCompleted: e.isCompleted,
          completedAt: e.completedAt,
          notes: e.notes ?? null,
        })
      }

      await db.tasks.clear()
      for (const t of merged.tasks) {
        const clean: Omit<Task, 'id'> = { ...t }
        delete (clean as Partial<Task>).id
        await db.tasks.add(clean as Task)
      }

      await db.bossChallenges.clear()
      for (const b of merged.bossChallenges) {
        const clean: Omit<BossChallenge, 'id'> = { ...b }
        delete (clean as Partial<BossChallenge>).id
        await db.bossChallenges.add(clean as BossChallenge)
      }

      await db.streakFreezes.clear()
      for (const f of merged.streakFreezes) {
        await db.streakFreezes.add({
          date: f.date,
          habitId: null,
          createdAt: f.createdAt,
        })
      }
    }
  )

  await recalculateAllHabitStreaks()

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('habitat_visited_dates', JSON.stringify(merged.visitedDates))
      if (merged.appStartDate) {
        localStorage.setItem('habitat_app_start_date', merged.appStartDate)
      }
      if (merged.accentThemeId) {
        applyAccentTheme(selectAndApplyAccentTheme(merged.accentThemeId))
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Full bi-directional sync with Supabase:
 *   1. Fetches remote snapshot (if any) for the signed-in Google user
 *   2. Merges local + remote non-destructively
 *   3. Saves merged state to IndexedDB + pushes merged state back to Supabase
 */
export async function syncWithSupabase(): Promise<{
  ok: boolean
  syncedAt?: number
  error?: string
}> {
  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData?.user
  if (userErr || !user) {
    return { ok: false, error: 'Not signed in' }
  }

  try {
    const local = await buildLocalSnapshot()

    const { data: remoteRow, error: fetchErr } = await supabase
      .from('user_snapshots')
      .select('snapshot')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      return { ok: false, error: fetchErr.message }
    }

    const finalSnapshot = remoteRow?.snapshot
      ? mergeSnapshots(local, remoteRow.snapshot as HabitatCloudSnapshot)
      : local

    if (remoteRow?.snapshot) {
      await applyMergedSnapshotToLocal(finalSnapshot)
    }

    const { error: upsertErr } = await supabase.from('user_snapshots').upsert(
      {
        user_id: user.id,
        email: user.email ?? null,
        snapshot: finalSnapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (upsertErr) {
      return { ok: false, error: upsertErr.message }
    }

    const ts = Date.now()
    setLastCloudSyncAt(ts)
    return { ok: true, syncedAt: ts }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sync failed',
    }
  }
}

/**
 * Overwrites the remote cloud snapshot with the current local state without merging.
 * Used after Erase All Data so previously deleted items do not merge back on reload.
 */
export async function overwriteCloudSnapshotWithLocal(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData?.user
  if (userErr || !user) return

  const local = await buildLocalSnapshot()
  await supabase.from('user_snapshots').upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      snapshot: local,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  setLastCloudSyncAt(Date.now())
}
