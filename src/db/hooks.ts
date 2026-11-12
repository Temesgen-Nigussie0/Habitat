import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** All non-archived habits */
export function useHabits() {
  return useLiveQuery(async () => {
    const all = await db.habits.orderBy('createdAt').toArray()
    return all.filter(h => !h.isArchived)
  }, [])
}

/** All habits (including archived) */
export function useAllHabits() {
  return useLiveQuery(() => db.habits.toArray(), [])
}

/** Entries for a specific date (local yyyy-MM-dd) */
export function useHabitEntries(date: string) {
  return useLiveQuery(() => db.habitEntries.where('date').equals(date).toArray(), [date])
}

/** All entries across all habits */
export function useAllEntries() {
  return useLiveQuery(() => db.habitEntries.toArray(), [])
}

/** All entries for a single habit */
export function useHabitEntriesForHabit(habitId: number) {
  return useLiveQuery(
    () => db.habitEntries.where('habitId').equals(habitId).toArray(),
    [habitId]
  )
}

/** All tasks */
export function useTasks() {
  return useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray(), [])
}

/** Singleton user profile (id = 1) */
export function useUserProfile() {
  return useLiveQuery(() => db.userProfile.get(1), [])
}

/** Distinguishes loading (undefined) from loaded ({ loaded: true, profile: UserProfile | null }) */
export function useUserProfileStatus() {
  return useLiveQuery(
    async () => ({
      loaded: true as const,
      profile: (await db.userProfile.get(1)) ?? null,
    }),
    []
  )
}

/** Active boss challenge (not failed, not completed) */
export function useActiveBossChallenge() {
  return useLiveQuery(async () => {
    const all = await db.bossChallenges.toArray()
    return all.find(c => c.isActive && !c.isFailed && !c.isCompleted)
  }, [])
}

/** All streak freeze records */
export function useStreakFreezes() {
  return useLiveQuery(() => db.streakFreezes.toArray(), [])
}

