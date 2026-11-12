import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import type { Task } from '../db/types'
import {
  getEisenhowerQuadrants,
  getKanbanColumns,
  type KanbanStatus,
} from '../lib/tasks'

interface EisenhowerMatrixViewProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onToggleComplete: (task: Task) => void
}

const PRIORITY_BADGE: Record<string, string> = {
  Urgent: 'bg-[#FF453A]/15 text-[#FF453A]',
  High: 'bg-[#FF453A]/15 text-[#FF453A]',
  Medium: 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  Low: 'bg-[#0A84FF]/15 text-[#0A84FF]',
}

export function EisenhowerMatrixView({
  tasks,
  onEditTask,
  onToggleComplete,
}: EisenhowerMatrixViewProps) {
  const { q1, q2, q3, q4 } = getEisenhowerQuadrants(tasks)

  const quadrants = [
    { key: 'q1', title: 'DO FIRST (Q1)', color: '#FF453A', items: q1 },
    { key: 'q2', title: 'DEEP WORK (Q2)', color: '#FF6A00', items: q2 },
    { key: 'q3', title: 'QUICK WINS (Q3)', color: '#FF9F0A', items: q3 },
    { key: 'q4', title: 'SHIPPED (Q4)', color: '#30D158', items: q4 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {quadrants.map((q) => (
        <div
          key={q.key}
          className="flex min-h-[210px] flex-col rounded-[20px] border border-[#242428] bg-[#161618] p-3"
        >
          <div className="mb-2.5 flex items-center justify-between gap-1">
            <span
              className="text-[11px] font-bold tracking-wider"
              style={{ color: q.color }}
            >
              {q.title}
            </span>
            <span className="rounded-full bg-[#242428] px-2 py-0.5 text-[11px] font-semibold text-[#A1A1AA]">
              {q.items.length}
            </span>
          </div>

          {q.items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-[12px] text-[#636366]">Empty</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
              {q.items.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="flex cursor-pointer items-start gap-2 rounded-[12px] border border-[#242428] bg-[#0D0D0E] p-2.5 active:scale-[0.98]"
                >
                  <button
                    type="button"
                    aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleComplete(task)
                    }}
                    className="mt-0.5 shrink-0 text-[#8E8E93]"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-[#30D158]" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[12px] font-semibold ${
                        task.isCompleted
                          ? 'text-[#636366] line-through'
                          : 'text-[#F5F5F7]'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[#8E8E93]">
                      {task.clientOrCourse || 'Personal Workspace'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface KanbanSprintBoardViewProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onMoveKanban: (taskId: number, targetStatus: KanbanStatus) => void
}

const KANBAN_ORDER: KanbanStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'SHIPPED']

export function KanbanSprintBoardView({
  tasks,
  onEditTask,
  onMoveKanban,
}: KanbanSprintBoardViewProps) {
  const columns = getKanbanColumns(tasks)

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4">
      {columns.map((col, colIdx) => {
        const prevStatus = colIdx > 0 ? KANBAN_ORDER[colIdx - 1] : null
        const nextStatus =
          colIdx < KANBAN_ORDER.length - 1 ? KANBAN_ORDER[colIdx + 1] : null

        return (
          <div
            key={col.key}
            className="flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col rounded-[22px] border border-[#242428] bg-[#161618] p-3.5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <h3 className="text-[14px] font-bold text-[#F5F5F7]">
                  {col.title}
                </h3>
              </div>
              <span className="rounded-full bg-[#242428] px-2.5 py-0.5 text-[12px] font-semibold text-[#A1A1AA]">
                {col.tasks.length}
              </span>
            </div>

            {col.tasks.length === 0 ? (
              <div className="flex min-h-[140px] items-center justify-center rounded-[14px] border border-dashed border-[#242428]">
                <span className="text-[12px] text-[#636366]">Empty</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {col.tasks.map((task) => {
                  const badgeClass =
                    PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.Medium
                  return (
                    <div
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className="cursor-pointer rounded-[16px] border border-[#242428] bg-[#0D0D0E] p-3 active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-[14px] font-semibold leading-snug ${
                            task.isCompleted
                              ? 'text-[#636366] line-through'
                              : 'text-[#F5F5F7]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-[#8E8E93]">
                          {task.clientOrCourse || 'Personal Workspace'}
                        </span>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {prevStatus && task.id !== undefined && (
                            <button
                              type="button"
                              aria-label={`Move back to ${prevStatus}`}
                              onClick={() => onMoveKanban(task.id!, prevStatus)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2C2C30] bg-[#161618] text-[#A1A1AA] active:scale-95"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {nextStatus && task.id !== undefined && (
                            <button
                              type="button"
                              aria-label={`Advance to ${nextStatus}`}
                              onClick={() => onMoveKanban(task.id!, nextStatus)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/15 text-[#FF6A00] active:scale-95"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

