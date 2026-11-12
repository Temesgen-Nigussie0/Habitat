import { format } from 'date-fns'
import { Info, X } from 'lucide-react'
import type { Task } from '../db/types'

interface TaskSpecificationsSheetProps {
  task: Task | null
  onClose: () => void
}

export default function TaskSpecificationsSheet({
  task,
  onClose,
}: TaskSpecificationsSheetProps) {
  if (!task) return null

  const createdFormatted = format(new Date(task.createdAt), "MMMM d, yyyy 'at' hh:mm a")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative w-full max-w-[370px] rounded-[24px] bg-surface border border-border-highlight p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={20} className="text-orange" />
            <h3 className="text-[17px] font-bold text-text-primary">
              Task Specifications
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

        <div>
          <p className="text-lg font-bold text-text-primary leading-snug">{task.title}</p>
          {task.notes && (
            <p className="text-text-secondary text-[13px] leading-relaxed mt-1.5">
              {task.notes}
            </p>
          )}
        </div>

        <div className="rounded-[14px] bg-elevated p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary text-xs">Priority</span>
            <span className="text-orange text-xs font-bold">{task.priority}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-tertiary text-xs">Workspace</span>
            <span className="text-text-primary text-xs">
              {task.clientOrCourse || 'General'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-tertiary text-xs">Due Date</span>
            <span className="text-text-primary text-xs">
              {task.dueDate || 'No deadline'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-text-tertiary text-xs flex-shrink-0">
              Created Timestamp
            </span>
            <span className="text-text-secondary text-[11px] font-medium text-right">
              {createdFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

