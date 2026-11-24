import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Grid2X2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  Flame,
} from 'lucide-react'
import { format, getDaysInMonth } from 'date-fns'
import { useReducedMotion } from 'framer-motion'
import Screen from '../components/Screen'
import FAB from '../components/FAB'
import ProgressRing from '../components/ProgressRing'
import ActionToast, { type ActionToastData } from '../components/ActionToast'
import { AddEditTaskSheet } from '../components/AddEditTaskSheet'
import CreateWorkspaceModal from '../components/CreateWorkspaceModal'
import TaskSpecificationsSheet from '../components/TaskSpecificationsSheet'
import {
  EisenhowerMatrixView,
  KanbanSprintBoardView,
} from '../components/TaskKanbanEisenhowerView'
import { useTasks, useUserProfile } from '../db/hooks'
import {
  addWorkspace,
  deleteTask,
  insertTask,
  toggleTaskCompleted,
  updateTask,
  updateTaskKanbanStatus,
} from '../db/actions'
import type { Task } from '../db/types'
import {
  filterAndSortTasks,
  getTaskDateStatus,
  getWorkspacesFromProfile,
  type KanbanStatus,
  type TaskPriorityFilter,
  type TaskViewMode,
} from '../lib/tasks'
import {
  formatLocalDate,
  getAppStartDate,
  getTodayLocal,
  parseLocalDate,
} from '../lib/streak'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Persist view & filters in memory while the app is open
let savedViewMode: TaskViewMode = 'BENTO'
let savedPriorityFilter: TaskPriorityFilter = 'ALL'
let savedWorkspaceFilter = 'ALL'

const PRIORITY_CHIP_STYLES: Record<string, string> = {
  Urgent: 'bg-[#FF453A]/15 text-[#FF453A]',
  High: 'bg-[#FF453A]/15 text-[#FF453A]',
  Medium: 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  Low: 'bg-[#0A84FF]/15 text-[#0A84FF]',
}

const DATE_TONE_CLASSES: Record<string, string> = {
  completed: 'text-[#30D158]',
  overdue: 'text-[#FF453A]',
  due: 'text-[#FF9F0A]',
  upcoming: 'text-[#FF9F0A]',
  none: 'text-[#8E8E93]',
}

export default function TasksScreen() {
  const prefersReducedMotion = useReducedMotion()
  const tasks = useTasks()
  const profile = useUserProfile()

  const todayStr = getTodayLocal()
  const now = new Date()

  const [viewMode, setViewMode] = useState<TaskViewMode>(savedViewMode)
  const [priorityFilter, setPriorityFilter] =
    useState<TaskPriorityFilter>(savedPriorityFilter)
  const [workspaceFilter, setWorkspaceFilter] =
    useState<string>(savedWorkspaceFilter)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr)

  const [menuOpen, setMenuOpen] = useState(false)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const [lowExpanded, setLowExpanded] = useState(false)
  const [mediumExpanded, setMediumExpanded] = useState(false)

  const [addEditOpen, setAddEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [specTask, setSpecTask] = useState<Task | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [actionToast, setActionToast] = useState<ActionToastData | null>(null)

  const selectedDayRef = useRef<HTMLButtonElement | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    savedViewMode = viewMode
  }, [viewMode])

  useEffect(() => {
    savedPriorityFilter = priorityFilter
  }, [priorityFilter])

  useEffect(() => {
    savedWorkspaceFilter = workspaceFilter
  }, [workspaceFilter])

  useEffect(() => {
    if (!toastMsg) return
    const t = window.setTimeout(() => setToastMsg(null), 2600)
    return () => window.clearTimeout(t)
  }, [toastMsg])

  useEffect(() => {
    if (!actionToast) return
    const t = window.setTimeout(() => setActionToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [actionToast])

  const tasksLoaded = tasks !== undefined
  useEffect(() => {
    if (!tasksLoaded) return
    const timer = window.setTimeout(() => {
      if (selectedDayRef.current) {
        selectedDayRef.current.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        })
      }
    }, 40)
    return () => window.clearTimeout(timer)
  }, [tasksLoaded, selectedMonth, selectedDateStr, viewMode, prefersReducedMotion])

  const workspaces = useMemo(
    () => getWorkspacesFromProfile(profile),
    [profile]
  )

  const monthDays = useMemo(() => {
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
    const count = getDaysInMonth(new Date(selectedYear, selectedMonth, 1))

    if (isCurrentMonth) {
      const appStartDate = getAppStartDate(profile?.joinedAt)
      const currentYearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
      const startDayNum = appStartDate.startsWith(currentYearMonth)
        ? parseLocalDate(appStartDate).getDate()
        : 1
      const daysLeft = count - startDayNum + 1
      return Array.from({ length: daysLeft }, (_, idx) => {
        const dayNum = startDayNum + idx
        const date = new Date(selectedYear, selectedMonth, dayNum)
        return {
          dateStr: formatLocalDate(date),
          dayNum,
          weekday: format(date, 'EEE'),
        }
      })
    }

    return Array.from({ length: count }, (_, idx) => {
      const date = new Date(selectedYear, selectedMonth, idx + 1)
      return {
        dateStr: formatLocalDate(date),
        dayNum: idx + 1,
        weekday: format(date, 'EEE'),
      }
    })
  }, [selectedYear, selectedMonth, now])

  const allTasks = tasks ?? []

  const filteredTasks = useMemo(
    () =>
      filterAndSortTasks(allTasks, {
        searchQuery,
        workspaceFilter,
        priorityFilter,
      }),
    [allTasks, searchQuery, workspaceFilter, priorityFilter]
  )

  const workspaceScopedTasks = useMemo(
    () =>
      filterAndSortTasks(allTasks, {
        searchQuery,
        workspaceFilter,
        priorityFilter: 'ALL',
      }),
    [allTasks, searchQuery, workspaceFilter]
  )

  const lowTasks = useMemo(
    () => workspaceScopedTasks.filter((t) => t.priority === 'Low'),
    [workspaceScopedTasks]
  )

  const mediumTasks = useMemo(
    () => workspaceScopedTasks.filter((t) => t.priority === 'Medium'),
    [workspaceScopedTasks]
  )

  const urgentHighCount = useMemo(
    () =>
      workspaceScopedTasks.filter(
        (t) =>
          !t.isCompleted && (t.priority === 'Urgent' || t.priority === 'High')
      ).length,
    [workspaceScopedTasks]
  )

  const completedCount = useMemo(
    () => workspaceScopedTasks.filter((t) => t.isCompleted).length,
    [workspaceScopedTasks]
  )
  const totalCount = workspaceScopedTasks.length
  const completionPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const [animatedPct, setAnimatedPct] = useState(completionPct)

  // Smoothly glide the task completion percentage counter
  useEffect(() => {
    let start = animatedPct
    const diff = completionPct - start
    if (diff === 0) return
    const duration = 750
    const startTime = performance.now()
    let frameId: number

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      const ease = 1 - Math.pow(1 - progress, 3)
      setAnimatedPct(Math.round(start + diff * ease))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [completionPct])

  const handleSelectMonth = (monthIdx: number) => {
    setSelectedMonth(monthIdx)
    setMonthMenuOpen(false)
    if (monthIdx === now.getMonth() && selectedYear === now.getFullYear()) {
      setSelectedDateStr(todayStr)
    } else {
      setSelectedDateStr(formatLocalDate(new Date(selectedYear, monthIdx, 1)))
    }
  }

  const handleSaveTask = async (
    taskData: Omit<Task, 'id'>,
    existingTask?: Task
  ) => {
    const isEdit = existingTask?.id !== undefined
    if (isEdit) {
      await updateTask({ ...taskData, id: existingTask.id })
    } else {
      await insertTask(taskData)
      if (
        workspaceFilter &&
        workspaceFilter.toLowerCase() !== 'all' &&
        taskData.clientOrCourse &&
        workspaceFilter.toLowerCase() !== taskData.clientOrCourse.toLowerCase()
      ) {
        setWorkspaceFilter(taskData.clientOrCourse)
      }
      if (searchQuery) {
        setSearchQuery('')
      }
    }
    const timeNote = taskData.dailyTimeline
      ? `Reminder set for ${taskData.dailyTimeline}`
      : taskData.dueDate
        ? `Scheduled for ${taskData.dueDate}`
        : 'Added to your tasks'
    setActionToast({
      title: isEdit ? `Task updated: ${taskData.title}` : `Task created: ${taskData.title}`,
      subtitle: timeNote,
      variant: 'task',
    })
  }

  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId)
  }

  const handleToggleTask = async (task: Task) => {
    if (task.id === undefined) return
    await toggleTaskCompleted(task.id, task.isCompleted)
  }

  const handleMoveKanban = async (taskId: number, status: KanbanStatus) => {
    await updateTaskKanbanStatus(taskId, status)
  }

  const startLongPress = (task: Task, clientX: number, clientY: number) => {
    longPressTriggeredRef.current = false
    pointerStartRef.current = { x: clientX, y: clientY }
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setSpecTask(task)
    }, 500)
  }

  const moveLongPress = (clientX: number, clientY: number) => {
    if (!pointerStartRef.current || !longPressTimerRef.current) return
    const dx = Math.abs(clientX - pointerStartRef.current.x)
    const dy = Math.abs(clientY - pointerStartRef.current.y)
    if (dx > 8 || dy > 8) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const visibleLowTasks = lowExpanded ? lowTasks : lowTasks.slice(0, 4)
  const visibleMediumTasks = mediumExpanded
    ? mediumTasks
    : mediumTasks.slice(0, 4)

  return (
    <Screen noNav={addEditOpen || Boolean(specTask)} className="px-4 pb-28">
      {/* Toast for Alert chip */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#FF453A]/50 bg-[#1C1C20] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Animated Bottom Action Toast */}
      <ActionToast toast={actionToast} onDismiss={() => setActionToast(null)} />

      {/* Top Row: Grid Button + Search Field */}
      <div className="relative flex items-center gap-3 pt-2">
        <button
          type="button"
          aria-label="Open view and filter menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#FF6A00]/60 bg-[#FF6A00]/10 text-[#FF6A00] active:scale-95"
        >
          <Grid2X2 className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="h-11 w-full rounded-[14px] border border-[#242428] bg-[#161618] pl-10 pr-9 text-[16px] text-[#F5F5F7] placeholder-[#636366] focus:border-[#FF6A00] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Grid Dropdown Menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-14 z-40 w-[290px] max-h-[70dvh] overflow-y-auto rounded-[20px] border border-[#2C2C30] bg-[#161618] p-2 shadow-2xl">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                VIEW LAYOUTS
              </p>
              {[
                { id: 'BENTO' as const, label: '📅 Timeline Bento' },
                { id: 'EISENHOWER' as const, label: '🎯 4-Quadrant Matrix' },
                { id: 'KANBAN' as const, label: '📋 Kanban Sprint' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setViewMode(item.id)
                    setMenuOpen(false)
                  }}
                  className={`flex min-h-[42px] w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium ${
                    viewMode === item.id
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00]'
                      : 'text-[#F5F5F7] hover:bg-[#242428]'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="my-2 border-t border-[#242428]" />
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                PRIORITY COLUMNS & FILTERS
              </p>
              {[
                { id: 'ALL' as const, label: '🌟 All Priorities' },
                {
                  id: 'MEDIUM' as const,
                  label: `🟠 Column 1: Medium (${mediumTasks.length})`,
                },
                {
                  id: 'LOW' as const,
                  label: `⚪ Column 2: Low (${lowTasks.length})`,
                },
                { id: 'URGENT' as const, label: '🔴 Urgent & High Tasks' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPriorityFilter(item.id)
                    setMenuOpen(false)
                  }}
                  className={`flex min-h-[42px] w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium ${
                    priorityFilter === item.id
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00]'
                      : 'text-[#F5F5F7] hover:bg-[#242428]'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="my-2 border-t border-[#242428]" />
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                WORKSPACE CATEGORIES
              </p>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setWorkspaceModalOpen(true)
                }}
                className="flex min-h-[42px] w-full items-center rounded-[12px] px-3 text-left text-[14px] font-semibold text-[#FF6A00] hover:bg-[#242428]"
              >
                ➕ Create New Workspace
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceFilter('ALL')
                  setMenuOpen(false)
                }}
                className={`flex min-h-[42px] w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium ${
                  workspaceFilter === 'ALL'
                    ? 'bg-[#FF6A00]/15 text-[#FF6A00]'
                    : 'text-[#F5F5F7] hover:bg-[#242428]'
                }`}
              >
                📂 All Workspaces
              </button>
              {workspaces.map((ws) => (
                <button
                  key={ws}
                  type="button"
                  onClick={() => {
                    setWorkspaceFilter(ws)
                    setMenuOpen(false)
                  }}
                  className={`flex min-h-[42px] w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium ${
                    workspaceFilter === ws
                      ? 'bg-[#FF6A00]/15 text-[#FF6A00]'
                      : 'text-[#F5F5F7] hover:bg-[#242428]'
                  }`}
                >
                  📁 {ws}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Loading State */}
      {tasks === undefined ? (
        <div className="mt-8 flex items-center justify-center py-12 text-[14px] text-[#8E8E93]">
          Loading tasks...
        </div>
      ) : viewMode === 'EISENHOWER' ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#F5F5F7]">
              4-Quadrant Matrix
            </h2>
            <span className="text-[12px] font-medium text-[#8E8E93]">
              {filteredTasks.length} Total
            </span>
          </div>
          <EisenhowerMatrixView
            tasks={filteredTasks}
            onEditTask={(t) => {
              setEditingTask(t)
              setAddEditOpen(true)
            }}
            onToggleComplete={handleToggleTask}
          />
        </div>
      ) : viewMode === 'KANBAN' ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#F5F5F7]">
              Kanban Sprint
            </h2>
            <span className="text-[12px] font-medium text-[#8E8E93]">
              {filteredTasks.length} Total
            </span>
          </div>
          <KanbanSprintBoardView
            tasks={filteredTasks}
            onEditTask={(t) => {
              setEditingTask(t)
              setAddEditOpen(true)
            }}
            onMoveKanban={handleMoveKanban}
          />
        </div>
      ) : (
        <>
          {/* Your Timeline + Month Dropdown */}
          <div className="relative mt-5 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#F5F5F7]">
              Your Timeline
            </h2>
            <button
              type="button"
              onClick={() => setMonthMenuOpen((v) => !v)}
              className="inline-flex min-h-[36px] items-center gap-1 text-[14px] font-semibold text-[#FF6A00]"
            >
              {MONTH_NAMES[selectedMonth]}
              <ChevronDown className="h-4 w-4" />
            </button>

            {monthMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMonthMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-40 max-h-[260px] w-44 overflow-y-auto rounded-[16px] border border-[#2C2C30] bg-[#161618] p-1.5 shadow-2xl">
                  {MONTH_NAMES.map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`flex min-h-[38px] w-full items-center rounded-[10px] px-3 text-left text-[13px] font-medium ${
                        selectedMonth === idx
                          ? 'bg-[#FF6A00] text-white'
                          : 'text-[#F5F5F7] hover:bg-[#242428]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Horizontal Day Strip */}
          <div
            className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {monthDays.map((d) => {
              const isSelected = d.dateStr === selectedDateStr
              const isToday = d.dateStr === todayStr
              return (
                <button
                  key={d.dateStr}
                  ref={isSelected ? selectedDayRef : undefined}
                  type="button"
                  onClick={() => setSelectedDateStr(d.dateStr)}
                  className={`flex min-h-[58px] min-w-[46px] shrink-0 flex-col items-center justify-center rounded-[16px] transition-colors ${
                    isSelected
                      ? isToday
                        ? 'bg-[#FF6A00] text-white border-2 border-[#FF6A00]'
                        : 'border-2 border-[#FF6A00] bg-[#FF6A00]/15 text-[#FF6A00]'
                      : isToday
                        ? 'border border-[#FF6A00]/60 bg-[#161618] text-[#F5F5F7]'
                        : 'border border-[#242428] bg-[#161618] text-[#A1A1AA]'
                  }`}
                >
                  <span
                    className={`text-[15px] font-bold leading-none ${
                      isSelected && !isToday ? 'text-[#FF6A00]' : ''
                    }`}
                  >
                    {d.dayNum}
                  </span>
                  <span
                    className={`mt-1 text-[11px] font-medium ${
                      isSelected
                        ? isToday
                          ? 'text-white/90'
                          : 'text-[#FF6A00]'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {d.weekday}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Priority Matrix Header */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#F5F5F7]">
              Priority Matrix
            </h2>
            <span className="text-[12px] font-medium text-[#8E8E93]">
              {urgentHighCount} Urgent/High • {totalCount} Total
            </span>
          </div>

          {/* Bento Cards */}
          <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
            {/* Left Column: Low Priority + Daily Task */}
            <div className="flex flex-col gap-3">
              {/* Low Priority Tasks Card */}
              <div className="flex flex-1 flex-col rounded-[24px] bg-[#F2F2F5] p-4 text-[#0D0D0E]">
                <h3 className="text-[14px] font-bold leading-tight">
                  Low Priority Tasks
                </h3>
                {lowTasks.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[#636366]">
                    No low priority tasks
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {visibleLowTasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleTask(t)}
                        className="flex min-h-[28px] items-center gap-2 text-left"
                      >
                        {t.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0D0D0E]" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-[#636366]" />
                        )}
                        <span
                          className={`truncate text-[12px] font-medium ${
                            t.isCompleted
                              ? 'text-[#8E8E93] line-through'
                              : 'text-[#0D0D0E]'
                          }`}
                        >
                          {t.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {lowTasks.length > 4 && (
                  <button
                    type="button"
                    aria-label="Toggle low priority tasks"
                    onClick={() => setLowExpanded((v) => !v)}
                    className="mt-2 flex items-center justify-center text-[#636366]"
                  >
                    {lowExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Daily Task Ring Card */}
              <div className="flex items-center gap-3 rounded-[24px] border border-[#242428] bg-[#161618] p-3.5">
                <ProgressRing
                  value={totalCount === 0 ? 0 : completedCount / totalCount}
                  size={44}
                  strokeWidth={4}
                >
                  <span className="text-[11px] font-bold text-[#F5F5F7]">
                    {animatedPct}%
                  </span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#F5F5F7]">
                    Daily Task
                  </p>
                  <p className="text-[11px] text-[#8E8E93]">
                    {completedCount}/{totalCount} done
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Medium Priority Tasks Card */}
            <div className="flex flex-col rounded-[24px] bg-[#FF6A00] p-4 text-white">
              <h3 className="text-[14px] font-bold leading-tight">
                Medium Priority Tasks
              </h3>
              {mediumTasks.length === 0 ? (
                <p className="mt-3 text-[12px] text-white/80">
                  No medium priority tasks
                </p>
              ) : (
                <div className="mt-2.5 flex flex-1 flex-col gap-2">
                  {visibleMediumTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className="flex min-h-[28px] items-center gap-2 text-left"
                    >
                      {t.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-white/80" />
                      )}
                      <span
                        className={`truncate text-[12px] font-medium ${
                          t.isCompleted
                            ? 'text-white/75 line-through'
                            : 'text-white'
                        }`}
                      >
                        {t.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {mediumTasks.length > 4 && (
                <button
                  type="button"
                  aria-label="Toggle medium priority tasks"
                  onClick={() => setMediumExpanded((v) => !v)}
                  className="mt-2 flex items-center justify-center text-white/90"
                >
                  {mediumExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Today's Task Section */}
          <div className="mt-6">
            <h2 className="mb-3 text-[18px] font-bold text-[#F5F5F7]">
              Today&apos;s Task
            </h2>

            {/* Priority Filter Pills (default: none selected; tap again to clear) */}
            <div className="mb-3.5 grid grid-cols-4 gap-2">
              {(
                [
                  { key: 'URGENT', label: 'Urgent', color: '#FF453A' },
                  { key: 'HIGH', label: 'High', color: '#FF6A00' },
                  { key: 'MEDIUM', label: 'Medium', color: '#FF9F0A' },
                  { key: 'LOW', label: 'Low', color: '#0A84FF' },
                ] as const
              ).map(({ key, label, color }) => {
                const active = priorityFilter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setPriorityFilter((prev) => (prev === key ? 'ALL' : key))
                    }
                    className="min-h-[38px] rounded-full border text-[12px] font-bold transition-all active:scale-95"
                    style={{
                      backgroundColor: active ? `${color}26` : '#161618',
                      borderColor: active ? color : '#242428',
                      color: active ? color : '#A1A1AA',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="rounded-[22px] border border-[#242428] bg-[#161618] p-8 text-center">
                <p className="text-[14px] font-medium text-[#8E8E93]">
                  No tasks found
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredTasks.map((task) => {
                  const dateStatus = getTaskDateStatus(task, selectedDateStr)
                  const chipClass =
                    PRIORITY_CHIP_STYLES[task.priority] ||
                    PRIORITY_CHIP_STYLES.Medium
                  const showAlert =
                    !task.isCompleted &&
                    (task.priority === 'Urgent' || task.priority === 'High')

                  return (
                    <div
                      key={task.id}
                      style={{ WebkitTouchCallout: 'none' }}
                      onPointerDown={(e) =>
                        startLongPress(task, e.clientX, e.clientY)
                      }
                      onPointerMove={(e) =>
                        moveLongPress(e.clientX, e.clientY)
                      }
                      onPointerUp={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onClick={() => {
                        if (longPressTriggeredRef.current) return
                        setSpecTask(task)
                      }}
                      className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-[22px] border border-[#242428] bg-[#161618] p-4 active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${chipClass}`}
                          >
                            {task.priority}
                          </span>
                          {showAlert && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setToastMsg(`${task.title} is burning down!`)
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-[#FF453A]/15 px-2 py-0.5 text-[10px] font-bold text-[#FF453A]"
                            >
                              Alert <Flame className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <p
                          className={`mt-1.5 truncate text-[15px] font-semibold ${
                            task.isCompleted
                              ? 'text-[#636366] line-through'
                              : 'text-[#F5F5F7]'
                          }`}
                        >
                          {task.title}
                        </p>

                        {dateStatus.text && (
                          <p
                            className={`mt-0.5 text-[12px] font-medium ${
                              DATE_TONE_CLASSES[dateStatus.tone]
                            }`}
                          >
                            {dateStatus.text}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label={
                          task.isCompleted
                            ? 'Mark task incomplete'
                            : 'Mark task complete'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleTask(task)
                        }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#8E8E93] active:scale-90"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-[#30D158]" />
                        ) : (
                          <Circle className="h-6 w-6 text-[#636366]" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Add Button */}
      <FAB
        onClick={() => {
          setEditingTask(null)
          setAddEditOpen(true)
        }}
        aria-label="Add task"
      />

      {/* Add/Edit Task Sheet */}
      <AddEditTaskSheet
        isOpen={addEditOpen}
        taskToEdit={editingTask}
        workspaces={workspaces}
        currentWorkspace={workspaceFilter}
        defaultDateStr={selectedDateStr}
        onClose={() => {
          setAddEditOpen(false)
          setEditingTask(null)
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onRequestNewWorkspace={() => setWorkspaceModalOpen(true)}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
        onCreate={async (name) => {
          await addWorkspace(name)
          setWorkspaceFilter(name)
        }}
      />

      {/* Task Specifications Sheet */}
      <TaskSpecificationsSheet
        task={specTask}
        onClose={() => setSpecTask(null)}
        onEdit={(t) => {
          setSpecTask(null)
          setEditingTask(t)
          setAddEditOpen(true)
        }}
      />
    </Screen>
  )
}
