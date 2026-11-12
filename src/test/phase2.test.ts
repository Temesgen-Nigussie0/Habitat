import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../db/types'
import {
  filterAndSortTasks,
  getEisenhowerQuadrants,
  getKanbanColumns,
  getTaskDateStatus,
  getWorkspacesFromProfile,
} from '../lib/tasks'
import { db, upgradeTaskV2 } from '../db/db'
import { toggleTaskCompleted, updateTaskKanbanStatus } from '../db/actions'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Sample Task',
    notes: '',
    category: 'Software Dev',
    priority: 'Medium',
    scope: 'Short-Term',
    dueDate: '2026-11-12',
    endDate: null,
    dailyTimeline: null,
    estimatedHours: 1,
    clientOrCourse: 'Personal Workspace',
    tags: '',
    kanbanStatus: 'TODO',
    isCompleted: false,
    completedAt: null,
    createdAt: 1000,
    ...overrides,
  }
}

describe('Phase 2: Tasks logic', () => {
  it('sorts uncompleted tasks Urgent -> High -> Medium -> Low, then completed last', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Done Urgent', priority: 'Urgent', isCompleted: true }),
      makeTask({ id: 2, title: 'Low', priority: 'Low', isCompleted: false }),
      makeTask({ id: 3, title: 'Urgent', priority: 'Urgent', isCompleted: false }),
      makeTask({ id: 4, title: 'Medium', priority: 'Medium', isCompleted: false }),
      makeTask({ id: 5, title: 'High', priority: 'High', isCompleted: false }),
    ]
    const sorted = filterAndSortTasks(tasks)
    expect(sorted.map((t) => t.title)).toEqual([
      'Urgent',
      'High',
      'Medium',
      'Low',
      'Done Urgent',
    ])
  })

  it('filters by priority (ALL, LOW, MEDIUM, URGENT)', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'Urgent' }),
      makeTask({ id: 2, priority: 'High' }),
      makeTask({ id: 3, priority: 'Medium' }),
      makeTask({ id: 4, priority: 'Low' }),
    ]
    expect(filterAndSortTasks(tasks, { priorityFilter: 'ALL' })).toHaveLength(4)
    expect(
      filterAndSortTasks(tasks, { priorityFilter: 'LOW' }).map((t) => t.priority)
    ).toEqual(['Low'])
    expect(
      filterAndSortTasks(tasks, { priorityFilter: 'MEDIUM' }).map((t) => t.priority)
    ).toEqual(['Medium'])
    expect(
      filterAndSortTasks(tasks, { priorityFilter: 'URGENT' }).map((t) => t.priority)
    ).toEqual(['Urgent', 'High'])
  })

  it('filters by workspace and search query across title, workspace, and notes', () => {
    const tasks = [
      makeTask({
        id: 1,
        title: 'Landing Page',
        clientOrCourse: 'Client Work',
        notes: 'Hero banner copy',
      }),
      makeTask({
        id: 2,
        title: 'Water Plants',
        clientOrCourse: 'Personal Workspace',
        notes: 'Balcony',
      }),
      makeTask({
        id: 3,
        title: 'Poster Export',
        clientOrCourse: 'Creative Studio',
        notes: 'CMYK profile',
      }),
    ]

    expect(
      filterAndSortTasks(tasks, { workspaceFilter: 'Client Work' }).map((t) => t.id)
    ).toEqual([1])

    expect(
      filterAndSortTasks(tasks, { searchQuery: 'cmyk' }).map((t) => t.id)
    ).toEqual([3])

    expect(
      filterAndSortTasks(tasks, { searchQuery: 'creative' }).map((t) => t.id)
    ).toEqual([3])

    expect(
      filterAndSortTasks(tasks, { searchQuery: 'landing' }).map((t) => t.id)
    ).toEqual([1])
  })

  it('computes exact date status strings and tones', () => {
    expect(
      getTaskDateStatus({ isCompleted: true, dueDate: '2026-11-10' }, '2026-11-12')
    ).toEqual({ text: 'Completed', tone: 'completed' })

    expect(
      getTaskDateStatus({ isCompleted: false, dueDate: '2026-11-12' }, '2026-11-12')
    ).toEqual({ text: 'Due on selected date', tone: 'due' })

    expect(
      getTaskDateStatus({ isCompleted: false, dueDate: '2026-11-11' }, '2026-11-12')
    ).toEqual({
      text: 'Overdue (Should be done before this day)',
      tone: 'overdue',
    })

    expect(
      getTaskDateStatus({ isCompleted: false, dueDate: '2026-11-15' }, '2026-11-12')
    ).toEqual({ text: 'Due on 2026-11-15', tone: 'upcoming' })

    expect(
      getTaskDateStatus({ isCompleted: false, dueDate: null }, '2026-11-12')
    ).toEqual({ text: '', tone: 'none' })
  })

  it('groups tasks into Eisenhower Q1-Q4 quadrants', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'Urgent', isCompleted: false }),
      makeTask({ id: 2, priority: 'High', isCompleted: false }),
      makeTask({ id: 3, priority: 'Medium', isCompleted: false }),
      makeTask({ id: 4, priority: 'Low', isCompleted: false }),
      makeTask({ id: 5, priority: 'Urgent', isCompleted: true }),
    ]
    const q = getEisenhowerQuadrants(tasks)
    expect(q.q1.map((t) => t.id)).toEqual([1, 2])
    expect(q.q2.map((t) => t.id)).toEqual([3])
    expect(q.q3.map((t) => t.id)).toEqual([4])
    expect(q.q4.map((t) => t.id)).toEqual([5])
  })

  it('groups tasks into Kanban columns and enforces SHIPPED <-> isCompleted sync', async () => {
    const tasks = [
      makeTask({ id: 1, kanbanStatus: 'TODO' }),
      makeTask({ id: 2, kanbanStatus: 'IN_PROGRESS' }),
      makeTask({ id: 3, kanbanStatus: 'REVIEW' }),
      makeTask({ id: 4, kanbanStatus: 'SHIPPED', isCompleted: true }),
    ]
    const cols = getKanbanColumns(tasks)
    expect(cols.map((c) => [c.title, c.tasks.length])).toEqual([
      ['Backlog', 1],
      ['In Progress', 1],
      ['Client Review', 1],
      ['Shipped ✓', 1],
    ])

    const updateSpy = vi
      .spyOn(db.tasks, 'update')
      .mockResolvedValue(1 as never)

    await toggleTaskCompleted(10, false)
    expect(updateSpy).toHaveBeenLastCalledWith(
      10,
      expect.objectContaining({
        isCompleted: true,
        kanbanStatus: 'SHIPPED',
      })
    )

    await toggleTaskCompleted(10, true)
    expect(updateSpy).toHaveBeenLastCalledWith(10, {
      isCompleted: false,
      completedAt: null,
      kanbanStatus: 'TODO',
    })

    await updateTaskKanbanStatus(11, 'SHIPPED')
    expect(updateSpy).toHaveBeenLastCalledWith(
      11,
      expect.objectContaining({
        kanbanStatus: 'SHIPPED',
        isCompleted: true,
      })
    )

    await updateTaskKanbanStatus(11, 'IN_PROGRESS')
    expect(updateSpy).toHaveBeenLastCalledWith(11, {
      kanbanStatus: 'IN_PROGRESS',
      isCompleted: false,
      completedAt: null,
    })

    updateSpy.mockRestore()
  })

  it('parses workspaces with default fallback and upgrades legacy v1 tasks in Dexie v2', () => {
    expect(getWorkspacesFromProfile(null)).toEqual([
      'Personal Workspace',
      'Client Work',
      'Creative Studio',
    ])

    expect(db.verno).toBeGreaterThanOrEqual(2)

    const legacyTask: Partial<Task> = {
      id: 7,
      title: 'Legacy V1 Task',
      priority: 'High',
      isCompleted: true,
      dueDate: '2026-11-01',
      clientOrCourse: 'Client Work',
    }
    upgradeTaskV2(legacyTask)

    expect(legacyTask.title).toBe('Legacy V1 Task')
    expect(legacyTask.clientOrCourse).toBe('Client Work')
    expect(legacyTask.kanbanStatus).toBe('SHIPPED')
    expect(legacyTask.scope).toBe('Short-Term')
    expect(legacyTask.tags).toBe('')
    expect(legacyTask.estimatedHours).toBe(1)
  })
})

