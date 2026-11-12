import { useState, useEffect } from 'react'
import { Briefcase, X } from 'lucide-react'

interface CreateWorkspaceModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<void> | void
}

export default function CreateWorkspaceModal({
  open,
  onClose,
  onCreate,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) setName('')
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || isSaving) return
    setIsSaving(true)
    try {
      await onCreate(trimmed)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[360px] rounded-[22px] bg-card border p-5 space-y-4"
        style={{ borderColor: 'rgba(255,106,0,0.5)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-orange" />
            <h3 className="text-base font-bold text-text-primary">
              Create New Workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center"
          >
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        <p className="text-text-tertiary text-xs leading-relaxed">
          Separate projects, clients, or courses into dedicated real workspaces.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Design Agency, Thesis 2026"
          autoFocus
          className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[14px] bg-elevated border border-border text-text-primary text-[16px] placeholder:text-text-tertiary focus:outline-none focus:border-orange"
        />

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] rounded-[12px] bg-elevated text-text-secondary text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSaving}
            className="flex-1 min-h-[46px] rounded-[12px] bg-orange text-white text-sm font-bold disabled:bg-elevated disabled:text-text-tertiary"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

