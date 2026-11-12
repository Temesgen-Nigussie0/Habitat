import { useEffect, useRef, useState } from 'react'
import { Download, HardDrive, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { format } from 'date-fns'
import {
  exportBackup,
  hasUndoBackup,
  parseBackupPreview,
  restoreBackupData,
  undoLastImport,
  type BackupPreview,
} from '../lib/backup'
import { eraseAllData } from '../db/actions'

interface DataBackupSectionProps {
  lastExportedAt?: number | null
  showNudge?: boolean
  onDismissNudge?: () => void
  onNotify: (msg: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DataBackupSection({
  lastExportedAt,
  showNudge = false,
  onDismissNudge,
  onNotify,
}: DataBackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [eraseStep, setEraseStep] = useState<0 | 1 | 2>(0)
  const [busy, setBusy] = useState(false)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{
    persisted: boolean | null
    usageBytes: number | null
  }>({ persisted: null, usageBytes: null })

  const refreshMeta = async () => {
    setUndoAvailable(await hasUndoBackup())
    try {
      const persisted = navigator.storage?.persisted
        ? await navigator.storage.persisted()
        : null
      const estimate = navigator.storage?.estimate
        ? await navigator.storage.estimate()
        : null
      setStorageInfo({
        persisted,
        usageBytes: typeof estimate?.usage === 'number' ? estimate.usage : null,
      })
    } catch {
      // Storage API unavailable
    }
  }

  useEffect(() => {
    void refreshMeta()
  }, [])

  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    try {
      await exportBackup()
      onNotify('Backup exported successfully')
    } catch {
      onNotify('Could not export backup')
    } finally {
      setBusy(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportError(null)
    try {
      const parsed = await parseBackupPreview(file)
      setPreview(parsed)
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'This file is not a valid Habitat backup.'
      )
    }
  }

  const handleConfirmImport = async () => {
    if (!preview || busy) return
    setBusy(true)
    try {
      await restoreBackupData(preview.data)
      setPreview(null)
      await refreshMeta()
      onNotify('Backup restored')
    } finally {
      setBusy(false)
    }
  }

  const handleUndo = async () => {
    if (busy) return
    setBusy(true)
    try {
      const restored = await undoLastImport()
      await refreshMeta()
      if (restored) {
        onNotify('Previous data restored')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleErase = async () => {
    if (eraseStep < 2) {
      setEraseStep((s) => (s + 1) as 0 | 1 | 2)
      return
    }
    setBusy(true)
    try {
      await eraseAllData()
      setEraseStep(0)
      await refreshMeta()
      onNotify('All data erased')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
        YOUR DATA
      </p>

      {/* Backup Nudge Card */}
      {showNudge && (
        <div className="mt-2.5 flex items-center justify-between gap-2.5 rounded-[18px] border border-[#FF9F0A]/45 bg-[#FF9F0A]/10 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#F5F5F7]">
              Back up your data
            </p>
            <p className="mt-0.5 text-[11px] text-[#A1A1AA]">
              Save a copy to Files so you never lose your streak history.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={handleExport}
              className="min-h-[38px] rounded-[10px] bg-[#FF6A00] px-3 text-[12px] font-bold text-white active:scale-95"
            >
              Export
            </button>
            {onDismissNudge && (
              <button
                type="button"
                aria-label="Dismiss backup nudge"
                onClick={onDismissNudge}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#2C2C30] bg-[#161618] text-[#8E8E93]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-2.5 rounded-[20px] border border-[#242428] bg-[#161618] p-4">
        {/* Storage Status */}
        <div className="mb-3 flex items-center justify-between gap-2 rounded-[14px] border border-[#242428] bg-[#0D0D0E] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 shrink-0 text-[#FF6A00]" />
            <span className="text-[12px] font-semibold text-[#F5F5F7]">
              Storage
            </span>
          </div>
          <span className="text-[11px] text-[#A1A1AA]">
            {storageInfo.persisted === null
              ? 'Local'
              : storageInfo.persisted
                ? 'Persistent'
                : 'Best-effort'}
            {storageInfo.usageBytes !== null
              ? ` · ${formatBytes(storageInfo.usageBytes)} used`
              : ''}
          </span>
        </div>

        <p className="text-[12px] leading-relaxed text-[#A1A1AA]">
          Your data lives only on this phone. Export a backup anytime to save a
          copy to Files.
        </p>

        <p className="mt-1.5 text-[11px] text-[#8E8E93]">
          {lastExportedAt
            ? `Last backup: ${format(new Date(lastExportedAt), 'MMM d, yyyy • h:mm a')}`
            : 'No backup exported yet'}
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleExport}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] border border-[#FF6A00]/50 bg-[#FF6A00]/15 text-[13px] font-bold text-[#FF6A00] active:scale-95"
          >
            <Download className="h-4 w-4" />
            Export backup
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] text-[13px] font-bold text-[#F5F5F7] active:scale-95"
          >
            <Upload className="h-4 w-4" />
            Import backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {undoAvailable && (
          <button
            type="button"
            disabled={busy}
            onClick={handleUndo}
            className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#0A84FF]/40 bg-[#0A84FF]/10 text-[13px] font-semibold text-[#0A84FF] active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Undo last import
          </button>
        )}

        {importError && (
          <p className="mt-2.5 text-[12px] font-medium text-[#FF453A]">
            {importError}
          </p>
        )}

        {/* Import Preview + Confirm */}
        {preview && (
          <div className="mt-3.5 rounded-[16px] border border-[#FF9F0A]/50 bg-[#0D0D0E] p-3.5">
            <p className="text-[13px] font-bold text-[#FF9F0A]">
              This will replace all data on this phone
            </p>
            <p className="mt-1 text-[12px] text-[#A1A1AA]">
              Backup contains {preview.habitsCount} habits,{' '}
              {preview.entriesCount} check-ins, and {preview.tasksCount} tasks.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="min-h-[44px] flex-1 rounded-[12px] border border-[#2C2C30] bg-[#161618] text-[12px] font-semibold text-[#A1A1AA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmImport}
                className="min-h-[44px] flex-1 rounded-[12px] bg-[#FF6A00] text-[12px] font-bold text-white"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        )}

        {/* Double-confirm Erase All Data */}
        <div className="mt-4 border-t border-[#242428] pt-3.5">
          <div className="flex items-center gap-2">
            {eraseStep > 0 && (
              <button
                type="button"
                onClick={() => setEraseStep(0)}
                className="min-h-[44px] flex-1 rounded-[12px] border border-[#2C2C30] bg-[#0D0D0E] text-[12px] font-semibold text-[#A1A1AA]"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleErase}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[12px] border text-[12px] font-bold ${
                eraseStep === 2
                  ? 'border-[#FF453A] bg-[#FF453A] text-white'
                  : 'border-[#FF453A]/40 bg-[#FF453A]/10 text-[#FF453A]'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {eraseStep === 0
                ? 'Erase all data'
                : eraseStep === 1
                  ? 'Tap again to confirm'
                  : 'Yes, Erase Everything'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
