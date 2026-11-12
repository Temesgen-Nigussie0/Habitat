import { db } from '../db/db'
import { updateLastExportedAt } from '../db/actions'
import { getTodayLocal } from './streak'

export interface BackupData {
  version: number
  exportedAt: string
  habits: unknown[]
  habitEntries: unknown[]
  tasks: unknown[]
  userProfile: unknown[]
  bossChallenges: unknown[]
  streakFreezes: unknown[]
}

export interface BackupPreview {
  data: BackupData
  exportedAt: string
  habitsCount: number
  entriesCount: number
  tasksCount: number
}

export async function createBackupPayload(): Promise<BackupData> {
  const [habits, habitEntries, tasks, userProfile, bossChallenges, streakFreezes] =
    await Promise.all([
      db.habits.toArray(),
      db.habitEntries.toArray(),
      db.tasks.toArray(),
      db.userProfile.toArray(),
      db.bossChallenges.toArray(),
      db.streakFreezes.toArray(),
    ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    habitEntries,
    tasks,
    userProfile,
    bossChallenges,
    streakFreezes,
  }
}

/**
 * Exports all Dexie tables to a JSON file.
 * On iPhone/supporting browsers, uses navigator.share({ files }) when navigator.canShare allows it;
 * otherwise falls back to a standard file download.
 */
export async function exportBackup(): Promise<void> {
  const backup = await createBackupPayload()
  const json = JSON.stringify(backup, null, 2)
  const filename = `habitat-backup-${getTodayLocal()}.json`
  const blob = new Blob([json], { type: 'application/json' })

  let shared = false
  if (typeof navigator !== 'undefined' && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: 'application/json' })
    if (
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: 'Habitat Backup',
        })
        shared = true
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return
        }
        // Fallback to download if share fails for non-abort reasons
      }
    }
  }

  if (!shared) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  await updateLastExportedAt(Date.now())
}

export async function parseBackupPreview(file: File): Promise<BackupPreview> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (!data.version || !Array.isArray(data.habits)) {
    throw new Error('Invalid backup file: missing required fields.')
  }

  return {
    data,
    exportedAt: data.exportedAt || 'Unknown date',
    habitsCount: data.habits.length,
    entriesCount: Array.isArray(data.habitEntries) ? data.habitEntries.length : 0,
    tasksCount: Array.isArray(data.tasks) ? data.tasks.length : 0,
  }
}

export async function restoreBackupData(data: BackupData): Promise<void> {
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
      if (Array.isArray(data.habitEntries) && data.habitEntries.length) {
        await db.habitEntries.bulkPut(data.habitEntries as never[])
      }
      if (Array.isArray(data.tasks) && data.tasks.length) {
        await db.tasks.bulkPut(data.tasks as never[])
      }
      if (Array.isArray(data.userProfile) && data.userProfile.length) {
        await db.userProfile.bulkPut(data.userProfile as never[])
      }
      if (Array.isArray(data.bossChallenges) && data.bossChallenges.length) {
        await db.bossChallenges.bulkPut(data.bossChallenges as never[])
      }
      if (Array.isArray(data.streakFreezes) && data.streakFreezes.length) {
        await db.streakFreezes.bulkPut(data.streakFreezes as never[])
      }
    }
  )
}

/**
 * Imports a backup JSON file, clearing all existing data first,
 * then bulk-inserting all records.
 */
export async function importBackup(file: File): Promise<void> {
  const preview = await parseBackupPreview(file)
  await restoreBackupData(preview.data)
}
