import type { Task, UserProfile } from '../db/types'

export type TaskViewMode = 'BENTO' | 'EISENHOWER' | 'KANBAN'
export type TaskPriorityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'URGENT'
export type KanbanStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'SHIPPED'

export const DEFAULT_WORKSPACES = [
  'Personal Workspace',
  'Client Work',
  'Creative Studio',
]

export const TASK_CATEGORIES = [
  'Software Dev',
  'Design & UI',
  'Video & Photo',
  'Academics',
  'Client Work',
  'Personal',
]

export const TASK_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'] as const

const PRIORITY_RANK: Record<string, number> = {
  Urgent: 1,
  High: 2,
  Medium: 3,
  Low: 4,
}

export function getWorkspacesFromProfile(profile?: UserProfile | null): string[] {
  const raw = profile?.workspaces
  if (!raw) return DEFAULT_WORKSPACES
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return parsed.length > 0 ? parsed : DEFAULT_WORKSPACES
}

export interface TaskFilterOptions {
  searchQuery?: string
  workspaceFilter?: string
  priorityFilter?: TaskPriorityFilter
}

export function filterTasksByWorkspace(
  tasks: Task[],
  workspaceFilter: string
): Task[] {
  if (!workspaceFilter || workspaceFilter === 'All') return tasks
  const target = workspaceFilter.toLowerCase()
  return tasks.filter((t) => (t.clientOrCourse ?? '').toLowerCase() === target)
}

/**
 * Filters by workspace, search query (title, workspace, notes), and priority,
 * then sorts strictly: uncompleted first (Urgent -> High -> Medium -> Low),
 * completed tasks at the bottom.
 */
export function filterAndSortTasks(
  tasks: Task[],
  options: TaskFilterOptions = {}
): Task[] {
  const {
    searchQuery = '',
    workspaceFilter = 'All',
    priorityFilter = 'ALL',
  } = options

  let list = filterTasksByWorkspace(tasks, workspaceFilter)

  const q = searchQuery.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.clientOrCourse ?? '').toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q)
    )
  }

  if (priorityFilter === 'LOW') {
    list = list.filter((t) => t.priority.toLowerCase() === 'low')
  } else if (priorityFilter === 'MEDIUM') {
    list = list.filter((t) => t.priority.toLowerCase() === 'medium')
  } else if (priorityFilter === 'URGENT') {
    list = list.filter(
      (t) =>
        t.priority.toLowerCase() === 'urgent' ||
        t.priority.toLowerCase() === 'high'
    )
  }

  return [...list].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1
    }
    const ra = PRIORITY_RANK[a.priority] ?? 4
    const rb = PRIORITY_RANK[b.priority] ?? 4
    if (ra !== rb) return ra - rb
    return b.createdAt - a.createdAt
  })
}

export interface TaskDateStatus {
  text: string
  tone: 'completed' | 'overdue' | 'due' | 'upcoming' | 'none'
}

export function getTaskDateStatus(
  task: Pick<Task, 'isCompleted' | 'dueDate'>,
  selectedDateStr: string
): TaskDateStatus {
  if (task.isCompleted) {
    return { text: 'Completed', tone: 'completed' }
  }
  const due = task.dueDate
  if (!due) {
    return { text: '', tone: 'none' }
  }
  if (due === selectedDateStr) {
    return { text: 'Due on selected date', tone: 'due' }
  }
  if (due < selectedDateStr) {
    return {
      text: 'Overdue (Should be done before this day)',
      tone: 'overdue',
    }
  }
  return { text: `Due on ${due}`, tone: 'upcoming' }
}

export interface EisenhowerQuadrants {
  q1: Task[]
  q2: Task[]
  q3: Task[]
  q4: Task[]
}

export function getEisenhowerQuadrants(tasks: Task[]): EisenhowerQuadrants {
  return {
    q1: tasks.filter(
      (t) => !t.isCompleted && (t.priority === 'Urgent' || t.priority === 'High')
    ),
    q2: tasks.filter((t) => !t.isCompleted && t.priority === 'Medium'),
    q3: tasks.filter((t) => !t.isCompleted && t.priority === 'Low'),
    q4: tasks.filter((t) => t.isCompleted),
  }
}

export interface KanbanColumnDef {
  key: KanbanStatus
  title: string
  color: string
  tasks: Task[]
}

export function getKanbanColumns(tasks: Task[]): KanbanColumnDef[] {
  const defs: Array<{ key: KanbanStatus; title: string; color: string }> = [
    { key: 'TODO', title: 'Backlog', color: '#0A84FF' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: '#FF6A00' },
    { key: 'REVIEW', title: 'Client Review', color: '#FF9F0A' },
    { key: 'SHIPPED', title: 'Shipped ✓', color: '#30D158' },
  ]

  return defs.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => {
      if (col.key === 'SHIPPED') {
        return t.isCompleted || t.kanbanStatus === 'SHIPPED'
      }
      const status = t.kanbanStatus?.trim() || 'TODO'
      return !t.isCompleted && status === col.key
    }),
  }))
}

