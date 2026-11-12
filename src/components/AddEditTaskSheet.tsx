import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Plus, Trash2, Calendar } from 'lucide-react'
import type { Task } from '../db/types'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../lib/tasks'
import { getTodayLocal } from '../lib/streak'

interface AddEditTaskSheetProps {
  isOpen: boolean
  taskToEdit?: Task | null
  workspaces: string[]
  defaultDateStr?: string
  onClose: () => void
  onSave: (taskData: Omit<Task, 'id'>, existingTask?: Task) => Promise<void>
  onDelete?: (taskId: number) => Promise<void>
  onRequestNewWorkspace: () => void
}

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Urgent: { bg: 'bg-[#FF453A]/20', border: 'border-[#FF453A]', text: 'text-[#FF453A]' },
  High: { bg: 'bg-[#FF6A00]/20', border: 'border-[#FF6A00]', text: 'text-[#FF6A00]' },
  Medium: { bg: 'bg-[#FF9F0A]/20', border: 'border-[#FF9F0A]', text: 'text-[#FF9F0A]' },
  Low: { bg: 'bg-[#0A84FF]/20', border: 'border-[#0A84FF]', text: 'text-[#0A84FF]' },
}

export function AddEditTaskSheet({
  isOpen,
  taskToEdit,
  workspaces,
  defaultDateStr,
  onClose,
  onSave,
  onDelete,
  onRequestNewWorkspace,
}: AddEditTaskSheetProps) {
  const prefersReducedMotion = useReducedMotion()
  const isEditing = Boolean(taskToEdit)

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [category, setCategory] = useState(TASK_CATEGORIES[0])
  const [priority, setPriority] = useState<string>('Medium')
  const [isDateRange, setIsDateRange] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const today = defaultDateStr || getTodayLocal()
    if (taskToEdit) {
      setTitle(taskToEdit.title)
      setNotes(taskToEdit.notes ?? '')
      setWorkspace(taskToEdit.clientOrCourse || workspaces[0] || 'Personal Workspace')
      setCategory(taskToEdit.category || TASK_CATEGORIES[0])
      setPriority(taskToEdit.priority || 'Medium')
      const hasRange = Boolean(taskToEdit.endDate)
      setIsDateRange(hasRange)
      setDueDate(taskToEdit.dueDate || today)
      setEndDate(taskToEdit.endDate || taskToEdit.dueDate || today)
    } else {
      setTitle('')
      setNotes('')
      setWorkspace(workspaces[0] || 'Personal Workspace')
      setCategory(TASK_CATEGORIES[0])
      setPriority('Medium')
      setIsDateRange(false)
      setDueDate(today)
      setEndDate(today)
    }
    setConfirmDelete(false)
    setIsSaving(false)
  }, [isOpen, taskToEdit, defaultDateStr, workspaces])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    try {
      const cleanTitle = title.trim() || 'Untitled Task'
      const cleanDue = dueDate.trim() || null
      const cleanEnd = isDateRange ? endDate.trim() || cleanDue : null
      const payload: Omit<Task, 'id'> = {
        title: cleanTitle,
        notes: notes.trim(),
        category,
        priority,
        scope: taskToEdit?.scope ?? 'Short-Term',
        dueDate: cleanDue,
        endDate: cleanEnd,
        dailyTimeline: taskToEdit?.dailyTimeline ?? null,
        estimatedHours: taskToEdit?.estimatedHours ?? 1,
        clientOrCourse: workspace.trim() || workspaces[0] || 'Personal Workspace',
        tags: taskToEdit?.tags ?? '',
        kanbanStatus: taskToEdit?.kanbanStatus ?? 'TODO',
        isCompleted: taskToEdit?.isCompleted ?? false,
        completedAt: taskToEdit?.completedAt ?? null,
        createdAt: taskToEdit?.createdAt ?? Date.now(),
      }
      await onSave(payload, taskToEdit ?? undefined)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!taskToEdit?.id || !onDelete || isSaving) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsSaving(true)
    try {
      await onDelete(taskToEdit.id)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 flex w-full max-w-[430px] max-h-[90dvh] flex-col rounded-t-[28px] sm:rounded-[28px] border border-[#2C2C30] bg-[#161618] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#242428] px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#F5F5F7]">
                {isEditing ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242428] text-[#8E8E93] active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be shipped?"
                  className="w-full rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] px-4 py-3 text-[16px] text-[#F5F5F7] placeholder-[#636366] focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Description & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter task objectives, deliverables, or specifications..."
                  className="w-full resize-none rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] px-4 py-3 text-[16px] text-[#F5F5F7] placeholder-[#636366] focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              {/* Workspace */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Workspace
                  </label>
                  <button
                    type="button"
                    onClick={onRequestNewWorkspace}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-3 text-[12px] font-semibold text-[#FF6A00] active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Workspace
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspaces.map((ws) => {
                    const active = workspace === ws
                    return (
                      <button
                        key={ws}
                        type="button"
                        onClick={() => setWorkspace(ws)}
                        className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                          active
                            ? 'bg-[#FF6A00] text-white'
                            : 'border border-[#2C2C30] bg-[#0D0D0E] text-[#A1A1AA]'
                        }`}
                      >
                        {ws}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {TASK_CATEGORIES.map((cat) => {
                    const active = category === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                          active
                            ? 'bg-[#F5F5F7] text-[#0D0D0E]'
                            : 'border border-[#2C2C30] bg-[#0D0D0E] text-[#A1A1AA]'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Task Priority */}
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Task Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TASK_PRIORITIES.map((p) => {
                    const active = priority === p
                    const style = PRIORITY_COLORS[p]
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`min-h-[44px] rounded-[12px] border text-[13px] font-semibold transition-colors ${
                          active
                            ? `${style.bg} ${style.border} ${style.text}`
                            : 'border-[#2C2C30] bg-[#0D0D0E] text-[#8E8E93]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Schedule Dates */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Schedule Dates
                  </label>
                  <div className="inline-flex rounded-full border border-[#2C2C30] bg-[#0D0D0E] p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsDateRange(false)}
                      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                        !isDateRange ? 'bg-[#FF6A00] text-white' : 'text-[#8E8E93]'
                      }`}
                    >
                      Fixed Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDateRange(true)}
                      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                        isDateRange ? 'bg-[#FF6A00] text-white' : 'text-[#8E8E93]'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                {!isDateRange ? (
                  <div>
                    <span className="mb-1 flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                      <Calendar className="h-3.5 w-3.5 text-[#FF6A00]" />
                      Fixed Ending Date
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full min-h-[44px] rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] px-4 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="mb-1 block text-[12px] text-[#8E8E93]">
                        Due Date (Start)
                      </span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="w-full min-h-[44px] rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] px-3 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[12px] text-[#8E8E93]">
                        End Date
                      </span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="w-full min-h-[44px] rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] px-3 py-2.5 text-[16px] text-[#F5F5F7] focus:border-[#FF6A00] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Actions Footer */}
            <div className="border-t border-[#242428] bg-[#161618] px-5 py-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="min-h-[50px] w-full rounded-[16px] bg-[#FF6A00] text-[15px] font-bold text-white shadow-lg shadow-[#FF6A00]/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {isEditing ? 'Save Changes' : 'Create Task'}
                </button>

                {isEditing && onDelete && (
                  <div className="flex items-center gap-2">
                    {confirmDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="min-h-[44px] flex-1 rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] text-[14px] font-semibold text-[#A1A1AA]"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSaving}
                      className={`min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-[14px] border text-[14px] font-semibold transition-colors ${
                        confirmDelete
                          ? 'border-[#FF453A] bg-[#FF453A] text-white'
                          : 'border-[#FF453A]/40 bg-[#FF453A]/10 text-[#FF453A]'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      {confirmDelete ? 'Confirm Delete' : 'Delete Task'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

