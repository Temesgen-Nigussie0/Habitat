import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface EditBioSheetProps {
  isOpen: boolean
  initialName: string
  initialHeadline: string
  initialOccupations: string
  initialBio: string
  onClose: () => void
  onSave: (
    name: string,
    headline: string,
    bio: string,
    occupations: string
  ) => Promise<void>
}

export default function EditBioSheet({
  isOpen,
  initialName,
  initialHeadline,
  initialOccupations,
  initialBio,
  onClose,
  onSave,
}: EditBioSheetProps) {
  const [name, setName] = useState(initialName)
  const [headline, setHeadline] = useState(initialHeadline)
  const [occupations, setOccupations] = useState(initialOccupations)
  const [bio, setBio] = useState(initialBio)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(initialName)
    setHeadline(initialHeadline)
    setOccupations(initialOccupations)
    setBio(initialBio)
    setIsSaving(false)
  }, [isOpen, initialName, initialHeadline, initialOccupations, initialBio])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    try {
      await onSave(
        name.trim() || 'Alex',
        headline.trim(),
        bio.trim(),
        occupations.trim()
      )
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-[430px] flex-col rounded-t-[28px] border border-[#2C2C30] bg-[#161618] shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[#242428] px-5 py-4">
          <h2 className="text-[18px] font-bold text-[#F5F5F7]">
            Edit Profile &amp; Bio
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#242428] text-[#A1A1AA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
        >
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#FF6A00]">
              FULL NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[12px] border border-[#242428] bg-[#0D0D0E] px-3.5 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#FF6A00]">
              HEADLINE / TITLE
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-[12px] border border-[#242428] bg-[#0D0D0E] px-3.5 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#FF6A00]">
              OCCUPATIONS &amp; CRAFTS (comma separated)
            </label>
            <input
              type="text"
              value={occupations}
              onChange={(e) => setOccupations(e.target.value)}
              className="w-full rounded-[12px] border border-[#242428] bg-[#0D0D0E] px-3.5 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#FF6A00]">
              ABOUT / BIO
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-[12px] border border-[#242428] bg-[#0D0D0E] px-3.5 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[48px] w-full rounded-[14px] bg-[#FF6A00] text-[15px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}

