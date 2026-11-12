import { db } from '../db/db'
import { getTodayLocal } from './streak'

interface BackupData {
  version: number
  exportedAt: string
  habits: unknown[]
  habitEntries: unknown[]
  tasks: unknown[]
  userProfile: unknown[]
  bossChallenges: unknown[]
  streakFreezes: unknown[]
}

/**
 * Exports all Dexie tables to a JSON file and triggers a browser download.
 * Filename: habitat-backup-yyyy-MM-dd.json
 */
export async function exportBackup(): Promise<void> {
  const [habits, habitEntries, tasks, userProfile, bossChallenges, streakFreezes] =
    await Promise.all([
      db.habits.toArray(),
      db.habitEntries.toArray(),
      db.tasks.toArray(),
      db.userProfile.toArray(),
      db.bossChallenges.toArray(),
      db.streakFreezes.toArray(),
    ])

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    habitEntries,
    tasks,
    userProfile,
    bossChallenges,
    streakFreezes,
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `habitat-backup-${getTodayLocal()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Imports a backup JSON file, clearing all existing data first,
 * then bulk-inserting all records.
 */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (!data.version || !Array.isArray(data.habits)) {
    throw new Error('Invalid backup file: missing required fields.')
  }

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

      if (data.habits.length) await db.habits.bulkPut(data.habits as never[])
      if (data.habitEntries.length) await db.habitEntries.bulkPut(data.habitEntries as never[])
      if (data.tasks.length) await db.tasks.bulkPut(data.tasks as never[])
      if (data.userProfile.length) await db.userProfile.bulkPut(data.userProfile as never[])
      if (data.bossChallenges.length) await db.bossChallenges.bulkPut(data.bossChallenges as never[])
      if (data.streakFreezes.length) await db.streakFreezes.bulkPut(data.streakFreezes as never[])
    }
  )
}
