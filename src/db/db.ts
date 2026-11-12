import Dexie, { type Table } from 'dexie'
import type { Habit, HabitEntry, Task, UserProfile, BossChallenge, StreakFreeze } from './types'

class HabitatDB extends Dexie {
  habits!: Table<Habit, number>
  habitEntries!: Table<HabitEntry, number>
  tasks!: Table<Task, number>
  userProfile!: Table<UserProfile, number>
  bossChallenges!: Table<BossChallenge, number>
  streakFreezes!: Table<StreakFreeze, number>

  constructor() {
    super('HabitatDB')

    this.version(1).stores({
      habits:
        '++id, isArchived, category, currentStreak, createdAt',

      habitEntries:
        '++id, [habitId+date], habitId, date, isCompleted',

      tasks:
        '++id, priority, kanbanStatus, isCompleted, dueDate, createdAt',

      userProfile:
        'id',

      bossChallenges:
        '++id, isActive, isFailed, isCompleted, createdAt',

      streakFreezes:
        '++id, date, habitId',
    })
  }
}

export const db = new HabitatDB()

