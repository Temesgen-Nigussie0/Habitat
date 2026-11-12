import { db } from '../db/db'
import { updateLastExportedAt } from '../db/actions'
import type { UserProfile } from '../db/types'
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

const NUDGE_DISMISS_KEY = 'habitat_backup_nudge_dismissed_until'
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function validateBackupData(raw: unknown): BackupData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('This file is not a valid Habitat backup.')
  }
  const obj = raw as Record<string, unknown>
  if (
    typeof obj.version !== 'number' ||
    typeof obj.exportedAt !== 'string' ||
    !Array.isArray(obj.habits) ||
    !Array.isArray(obj.habitEntries) ||
    !Array.isArray(obj.tasks) ||
    !Array.isArray(obj.userProfile)
  ) {
    throw new Error('This file is not a valid Habitat backup.')
  }

  return {
    version: obj.version,
    exportedAt: obj.exportedAt,
    habits: obj.habits,
    habitEntries: obj.habitEntries,
    tasks: obj.tasks,
    userProfile: obj.userProfile,
    bossChallenges: Array.isArray(obj.bossChallenges) ? obj.bossChallenges : [],
    streakFreezes: Array.isArray(obj.streakFreezes) ? obj.streakFreezes : [],
  }
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

export async function saveBeforeRestoreSnapshot(): Promise<void> {
  const payload = await createBackupPayload()
  await db.meta.put({
    key: 'lastBeforeRestore',
    value: JSON.stringify(payload),
    updatedAt: Date.now(),
  })
}

export async function hasUndoBackup(): Promise<boolean> {
  try {
    const entry = await db.meta.get('lastBeforeRestore')
    return Boolean(entry?.value)
  } catch {
    return false
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
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid Habitat backup.')
  }
  const data = validateBackupData(parsed)

  return {
    data,
    exportedAt: data.exportedAt || 'Unknown date',
    habitsCount: data.habits.length,
    entriesCount: data.habitEntries.length,
    tasksCount: data.tasks.length,
  }
}

export async function restoreBackupData(
  raw: unknown,
  options: { saveSnapshot?: boolean } = { saveSnapshot: true }
): Promise<void> {
  const data = validateBackupData(raw)

  if (options.saveSnapshot !== false) {
    await saveBeforeRestoreSnapshot()
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

export async function undoLastImport(): Promise<boolean> {
  const snapshot = await db.meta.get('lastBeforeRestore')
  if (!snapshot?.value) return false
  const parsed = JSON.parse(snapshot.value)
  await restoreBackupData(parsed, { saveSnapshot: false })
  await db.meta.delete('lastBeforeRestore')
  return true
}

/**
 * Imports a backup JSON file, clearing all existing data first,
 * then bulk-inserting all records.
 */
export async function importBackup(file: File): Promise<void> {
  const preview = await parseBackupPreview(file)
  await restoreBackupData(preview.data)
}

export function shouldShowBackupNudge(
  profile: UserProfile | null | undefined,
  completedEntriesCount: number,
  nowMs: number = Date.now()
): boolean {
  if (completedEntriesCount < 5) return false

  try {
    const dismissedUntilRaw = localStorage.getItem(NUDGE_DISMISS_KEY)
    if (dismissedUntilRaw && nowMs < Number(dismissedUntilRaw)) {
      return false
    }
  } catch {
    // Ignore storage errors
  }

  const lastExport = profile?.lastExportedAt
  if (!lastExport) return true
  return nowMs - lastExport > FOURTEEN_DAYS_MS
}

export function dismissBackupNudgeFor7Days(nowMs: number = Date.now()): void {
  try {
    localStorage.setItem(NUDGE_DISMISS_KEY, String(nowMs + SEVEN_DAYS_MS))
  } catch {
    // Ignore storage errors
  }
}
