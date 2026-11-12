import Dexie, { type Table } from 'dexie'
import type { Habit, HabitEntry, Task, UserProfile, BossChallenge, StreakFreeze } from './types'

export interface MetaEntry {
  key: string
  value: string
  updatedAt: number
}

class HabitatDB extends Dexie {
  habits!: Table<Habit, number>
  habitEntries!: Table<HabitEntry, number>
  tasks!: Table<Task, number>
  userProfile!: Table<UserProfile, number>
  bossChallenges!: Table<BossChallenge, number>
  streakFreezes!: Table<StreakFreeze, number>
  meta!: Table<MetaEntry, string>

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

    // Phase 3: add smart scheduler & lastExportedAt defaults on userProfile
    this.version(3)
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
          .table('userProfile')
          .toCollection()
          .modify((profile: Partial<UserProfile>) => {
            upgradeProfileV3(profile)
          })
      })

    // Phase 4: add meta key-value store for safety snapshots (lastBeforeRestore)
    this.version(4).stores({
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

      meta:
        'key',
    })
  }
}

export function upgradeProfileV3(profile: Partial<UserProfile>): void {
  if (typeof profile.smartSchedulerEnabled !== 'boolean') {
    profile.smartSchedulerEnabled = true
  }
  if (typeof profile.smartScheduleTimes !== 'string') {
    profile.smartScheduleTimes = '{}'
  }
  if (profile.lastExportedAt === undefined) {
    profile.lastExportedAt = null
  }
  if (typeof profile.streakFreezesAvailable !== 'number') {
    profile.streakFreezesAvailable = 1
  }
  if (typeof profile.streakFreezesUsed !== 'number') {
    profile.streakFreezesUsed = 0
  }
  if (typeof profile.isComebackProtocolActive !== 'boolean') {
    profile.isComebackProtocolActive = false
  }
  if (profile.lastFreezeDate === undefined) {
    profile.lastFreezeDate = null
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
