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

    // Phase 2: index clientOrCourse & scope on tasks while preserving all existing rows
    this.version(2)
      .stores({
        habits:
          '++id, isArchived, category, currentStreak, createdAt',

        habitEntries:
          '++id, [habitId+date], habitId, date, isCompleted',

        tasks:
          '++id, priority, kanbanStatus, isCompleted, dueDate, clientOrCourse, scope, createdAt',

        userProfile:
          'id',

        bossChallenges:
          '++id, isActive, isFailed, isCompleted, createdAt',

        streakFreezes:
          '++id, date, habitId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: Partial<Task>) => {
            upgradeTaskV2(task)
          })
      })
  }
}

export function upgradeTaskV2(task: Partial<Task>): void {
  if (!task.kanbanStatus) {
    task.kanbanStatus = task.isCompleted ? 'SHIPPED' : 'TODO'
  }
  if (!task.scope) {
    task.scope = 'Short-Term'
  }
  if (task.tags === undefined || task.tags === null) {
    task.tags = ''
  }
  if (typeof task.estimatedHours !== 'number') {
    task.estimatedHours = 1
  }
}

export const db = new HabitatDB()
