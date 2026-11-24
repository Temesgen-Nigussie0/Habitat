import { db } from './db'
import type { Habit, HabitEntry, Task, UserProfile, BossChallenge } from './types'
import { calculateStreak, getHabitStartDate, getTodayLocal } from '../lib/streak'
import { mapPresetToHabit } from '../lib/stats'

// ─── Habit CRUD ──────────────────────────────────────────────────────────────

export async function insertHabit(h: Omit<Habit, 'id'>): Promise<number> {
  return (await db.habits.add(h)) as number
}

export async function updateHabit(h: Habit): Promise<void> {
  await db.transaction('rw', db.habits, db.habitEntries, db.streakFreezes, async () => {
    await db.habits.put(h)
    if (h.id !== undefined) {
      await _recalculateStreak(h.id)
    }
  })
}

export async function deleteHabit(id: number): Promise<void> {
  await db.transaction('rw', db.habits, db.habitEntries, async () => {
    await db.habits.delete(id)
    await db.habitEntries.where('habitId').equals(id).delete()
  })
}

export async function archiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { isArchived: true })
}

// ─── Habit Entries ───────────────────────────────────────────────────────────

/**
 * Toggle completion for a habit on a date.
 * Returns false if the date is in the future (locked).
 * Logic:
 *   - No entry yet → create with count=1 (or mark complete if targetCount=1)
 *   - Entry is completed → delete entry (un-complete)
 *   - Entry is partial → increment count, mark complete if reached target
 */
export async function toggleHabitCompletion(
  habitId: number,
  date: string,
  targetCount: number
): Promise<boolean> {
  const today = getTodayLocal()
  if (date > today) return false

  await db.transaction('rw', db.habits, db.habitEntries, db.streakFreezes, async () => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first()

    if (!existing) {
      const entry: HabitEntry = {
        habitId,
        date,
        currentCount: 1,
        targetCount,
        isCompleted: 1 >= targetCount,
        completedAt: Date.now(),
        notes: null,
      }
      await db.habitEntries.add(entry)
    } else if (existing.isCompleted) {
      // Un-complete: remove entry
      await db.habitEntries.delete(existing.id!)
    } else {
      // Increment
      const newCount = existing.currentCount + 1
      await db.habitEntries.put({
        ...existing,
        currentCount: newCount,
        isCompleted: newCount >= targetCount,
        completedAt: Date.now(),
      })
    }

    await _recalculateStreak(habitId)
  })

  return true
}

/**
 * Increment counter habit (never toggles back down).
 * Returns false if date is in the future.
 */
export async function incrementHabitCounter(
  habitId: number,
  date: string,
  targetCount: number
): Promise<boolean> {
  const today = getTodayLocal()
  if (date > today) return false

  await db.transaction('rw', db.habits, db.habitEntries, db.streakFreezes, async () => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first()

    if (!existing) {
      await db.habitEntries.add({
        habitId,
        date,
        currentCount: 1,
        targetCount,
        isCompleted: 1 >= targetCount,
        completedAt: Date.now(),
        notes: null,
      })
    } else {
      const newCount = existing.currentCount + 1
      await db.habitEntries.put({
        ...existing,
        currentCount: newCount,
        isCompleted: newCount >= targetCount,
        completedAt: Date.now(),
      })
    }

    await _recalculateStreak(habitId)
  })

  return true
}

/** Recalculate and persist streak for a habit. Called after any entry change. */
async function _recalculateStreak(habitId: number): Promise<void> {
  const habit = await db.habits.get(habitId)
  if (!habit) return

  const entries = await db.habitEntries.where('habitId').equals(habitId).toArray()
  const completedDates = entries
    .filter(e => e.isCompleted)
    .map(e => e.date)

  const allFreezes = await db.streakFreezes.toArray()
  const freezeDates = allFreezes
    .filter(f => f.habitId === null || f.habitId === habitId)
    .map(f => f.date)

  const result = calculateStreak(
    completedDates,
    habit.frequency,
    habit.customDays,
    freezeDates,
    undefined,
    habit.intervalDays,
    getHabitStartDate(habit)
  )

  await db.habits.update(habitId, {
    currentStreak: result.currentStreak,
    bestStreak: Math.max(habit.bestStreak, result.bestStreak),
    lastCompletedDate: result.lastCompletedDate,
  })
}

/**
 * Mark a habit as completed for a given date (idempotent — won't toggle off if already done).
 * Used when a timed habit finishes its countdown.
 */
export async function completeHabitForDate(
  habitId: number,
  date: string,
  targetCount: number = 1
): Promise<boolean> {
  const today = getTodayLocal()
  if (date > today) return false

  await db.transaction('rw', db.habits, db.habitEntries, db.streakFreezes, async () => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first()

    if (!existing) {
      await db.habitEntries.add({
        habitId,
        date,
        currentCount: Math.max(1, targetCount),
        targetCount: Math.max(1, targetCount),
        isCompleted: true,
        completedAt: Date.now(),
        notes: null,
      })
    } else if (!existing.isCompleted) {
      await db.habitEntries.put({
        ...existing,
        currentCount: Math.max(existing.targetCount, targetCount, 1),
        isCompleted: true,
        completedAt: Date.now(),
      })
    }

    await _recalculateStreak(habitId)
  })

  return true
}

/** Recalculate streaks for all active habits so stored streaks never go stale across day boundaries. */
export async function recalculateAllHabitStreaks(): Promise<void> {
  const habits = await db.habits.toArray()
  await db.transaction('rw', db.habits, db.habitEntries, db.streakFreezes, async () => {
    for (const h of habits) {
      if (h.id !== undefined && !h.isArchived) {
        await _recalculateStreak(h.id)
      }
    }
  })
}

// ─── User Profile ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  userName: 'Alex',
  headline: 'CS Student & Visual Creator',
  bio: 'Designing software systems, crafting cinematic edits, and engineering daily relentless habits.',
  bannerUri: null,
  avatarUri: null,
  focusArea: 'Physical Vitality',
  currentConsistency: 'Starting fresh',
  frictionHurdle: 'Lack of time',
  targetHabitLoad: '3-4 Balanced routine',
  primeZone: 'Early Morning',
  starterHabits: 'Drink 2L Water,Read 15 Pages,10 Min Meditation',
  motivationStyle: 'Streak Counter & Heatmaps',
  timeCommitment: '15 - 30 minutes',
  briefingTime: '08:00 AM',
  pledgeAccepted: false,
  isOnboardingCompleted: false,
  occupations: 'Computer Science, Client Freelancer, Visual Creator',
  workspaces: 'Personal Workspace, Creative Studio, Client Work',
  streakFreezesAvailable: 1,
  streakFreezesUsed: 0,
  isComebackProtocolActive: false,
  lastFreezeDate: null,
  smartSchedulerEnabled: true,
  smartScheduleTimes: '{}',
  lastExportedAt: null,
  joinedAt: Date.now(),
}

export async function getOrCreateProfile(): Promise<UserProfile> {
  const existing = await db.userProfile.get(1)
  if (existing) return existing
  await db.userProfile.add(DEFAULT_PROFILE)
  return DEFAULT_PROFILE
}

export async function upsertUserProfile(partial: Partial<UserProfile>): Promise<void> {
  const current = await db.userProfile.get(1)
  if (current) {
    await db.userProfile.put({ ...current, ...partial, id: 1 })
  } else {
    await db.userProfile.put({ ...DEFAULT_PROFILE, ...partial, id: 1 })
  }
}

export async function completeOnboarding(
  profileInput: Partial<UserProfile>,
  selectedHabitNames: string[]
): Promise<void> {
  const starterList =
    selectedHabitNames.length > 0
      ? selectedHabitNames
      : ['Drink 2L Water', 'Read 15 Pages']

  await db.transaction('rw', db.userProfile, db.habits, async () => {
    const current = await db.userProfile.get(1)
    const nextProfile: UserProfile = {
      ...(current ?? DEFAULT_PROFILE),
      ...profileInput,
      id: 1,
      starterHabits: starterList.join(','),
      pledgeAccepted: true,
      isOnboardingCompleted: true,
      joinedAt: current?.joinedAt ?? Date.now(),
    }
    await db.userProfile.put(nextProfile)

    const existingCount = await db.habits.count()
    if (existingCount === 0) {
      const now = Date.now()
      const habitsToInsert: Omit<Habit, 'id'>[] = starterList.map((name, idx) => ({
        ...mapPresetToHabit(name),
        createdAt: now + idx,
      }))
      await db.habits.bulkAdd(habitsToInsert)
    }
  })
}

export async function addWorkspace(name: string): Promise<void> {
  const profile = await getOrCreateProfile()
  const list = profile.workspaces
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (!list.includes(name.trim())) {
    list.push(name.trim())
    await upsertUserProfile({ workspaces: list.join(', ') })
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function insertTask(t: Omit<Task, 'id'>): Promise<number> {
  return (await db.tasks.add(t)) as number
}

export async function updateTask(t: Task): Promise<void> {
  await db.tasks.put(t)
}

export async function toggleTaskCompleted(id: number, currentCompleted: boolean): Promise<void> {
  const newCompleted = !currentCompleted
  await db.tasks.update(id, {
    isCompleted: newCompleted,
    completedAt: newCompleted ? Date.now() : null,
    kanbanStatus: newCompleted ? 'SHIPPED' : 'TODO',
  })
}

export async function updateTaskKanbanStatus(id: number, status: string): Promise<void> {
  const isShipped = status === 'SHIPPED'
  await db.tasks.update(id, {
    kanbanStatus: status,
    isCompleted: isShipped,
    completedAt: isShipped ? Date.now() : null,
  })
}

export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id)
}

// ─── Boss Mode ────────────────────────────────────────────────────────────────

export async function startBossChallenge(c: Omit<BossChallenge, 'id'>): Promise<number> {
  return (await db.bossChallenges.add(c)) as number
}

export async function updateBossChallenge(c: BossChallenge): Promise<void> {
  await db.bossChallenges.put(c)
}

export async function quitBossChallenge(id: number, reason: string): Promise<void> {
  await db.bossChallenges.update(id, {
    isActive: false,
    isFailed: true,
    quitReason: reason,
  })
}

// ─── Streak Freezes ───────────────────────────────────────────────────────────

export async function addStreakFreeze(date: string, habitId?: number): Promise<number> {
  return (await db.streakFreezes.add({
    date,
    habitId: habitId ?? null,
    createdAt: Date.now(),
  })) as number
}

export async function activateStreakFreeze(): Promise<boolean> {
  const profile = await getOrCreateProfile()
  if (profile.streakFreezesAvailable <= 0) return false

  const today = getTodayLocal()
  const existingToday = await db.streakFreezes.where('date').equals(today).count()
  if (existingToday > 0 || profile.lastFreezeDate === today) return false

  await db.transaction(
    'rw',
    db.userProfile,
    db.streakFreezes,
    db.habits,
    db.habitEntries,
    async () => {
      await db.streakFreezes.add({ date: today, habitId: null, createdAt: Date.now() })
      await upsertUserProfile({
        streakFreezesAvailable: profile.streakFreezesAvailable - 1,
        streakFreezesUsed: profile.streakFreezesUsed + 1,
        lastFreezeDate: today,
      })
      const habits = await db.habits.toArray()
      for (const h of habits) {
        if (!h.isArchived && h.id !== undefined) {
          await _recalculateStreak(h.id)
        }
      }
    }
  )
  return true
}

export async function setComebackProtocolActive(active: boolean): Promise<void> {
  await upsertUserProfile({ isComebackProtocolActive: active })
}

export async function updateSmartSchedule(
  enabled: boolean,
  timesMap: Record<number, string>
): Promise<void> {
  await upsertUserProfile({
    smartSchedulerEnabled: enabled,
    smartScheduleTimes: JSON.stringify(timesMap),
  })
}

export async function updateLastExportedAt(timestamp: number): Promise<void> {
  await upsertUserProfile({ lastExportedAt: timestamp })
}

export async function retakeOnboarding(): Promise<void> {
  await upsertUserProfile({ isOnboardingCompleted: false })
}

export async function addQuickHabitIfNew(
  habitInput: Omit<Habit, 'id'>
): Promise<boolean> {
  const existing = await db.habits.toArray()
  const duplicate = existing.some(
    (h) => h.name.trim().toLowerCase() === habitInput.name.trim().toLowerCase()
  )
  if (duplicate) return false
  await db.habits.add(habitInput)
  return true
}

const SAMPLE_ERASE_HABITS = [
  'Drink 2L Water',
  '10 Min Meditation',
  '30 Min Exercise / Walk',
  'Plan Top 3 Priorities',
  'Read 15 Pages',
]

export async function eraseAllData(): Promise<void> {
  const { saveBeforeRestoreSnapshot } = await import('../lib/backup')
  await saveBeforeRestoreSnapshot()

  const today = getTodayLocal()
  const now = Date.now()

  await db.transaction(
    'rw',
    [db.habits, db.habitEntries, db.tasks, db.userProfile, db.bossChallenges, db.streakFreezes],
    async () => {
      await db.habits.clear()
      await db.habitEntries.clear()
      await db.tasks.clear()
      await db.userProfile.clear()
      await db.bossChallenges.clear()
      await db.streakFreezes.clear()

      await db.userProfile.put({
        ...DEFAULT_PROFILE,
        id: 1,
        isOnboardingCompleted: true,
        pledgeAccepted: true,
        joinedAt: now,
        avatarUri: null,
        bannerUri: null,
        streakFreezesAvailable: 0,
        lastFreezeDate: null,
        starterHabits: SAMPLE_ERASE_HABITS.join(','),
      })

      const starterHabits: Omit<Habit, 'id'>[] = SAMPLE_ERASE_HABITS.map((name, idx) => ({
        ...mapPresetToHabit(name),
        startDate: today,
        createdAt: now + idx,
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
      }))
      await db.habits.bulkAdd(starterHabits)
    }
  )

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('habitat_app_start_date', today)
      localStorage.removeItem('habitat_visited_dates')
      localStorage.removeItem('habitat_last_visited_date')
      localStorage.removeItem('habitat_streak_levelup_date')
      localStorage.removeItem('habitat_last_streak_date')
      localStorage.removeItem('habitat_last_levelup_date')
      localStorage.removeItem('habitat_sunday_review_dismissed_date')
      localStorage.removeItem('habitat_habit_timers_v1')
      localStorage.removeItem('habitat_scheduled_task_reminders_v1')
      localStorage.removeItem('habitat_scheduled_habit_reminders_v1')
      localStorage.removeItem('habitat_backup_nudge_dismissed_until')
    } catch {
      // ignore
    }
  }

  try {
    const { overwriteCloudSnapshotWithLocal } = await import('../lib/cloudSync')
    await overwriteCloudSnapshotWithLocal()
  } catch {
    // ignore offline / unconfigured cloud errors
  }
}

