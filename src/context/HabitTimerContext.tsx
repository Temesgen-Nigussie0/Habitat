import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Habit } from '../db/types'
import { completeHabitForDate } from '../db/actions'
import { getTodayLocal } from '../lib/streak'
import {
  computeTimerSnapshot,
  formatDurationHuman,
  loadPersistedTimers,
  playTimerCompletionChime,
  savePersistedTimers,
  unlockTimerAudio,
  type HabitTimerSnapshot,
  type HabitTimerState,
} from '../lib/habitTimer'
import {
  isNotificationSupported,
  requestAppNotificationPermission,
  sendNativeNotification,
} from '../lib/notifications'

export interface TimerCompletionNotice {
  habitId: number
  habitName: string
  minutes: number
  timestamp: number
}

interface HabitTimerContextValue {
  getSnapshot: (habit: Habit) => HabitTimerSnapshot
  startTimer: (habit: Habit) => void
  pauseTimer: (habitId: number) => void
  toggleTimer: (habit: Habit) => void
  adjustTime: (habit: Habit, deltaMinutes: number) => void
  resetTimer: (habit: Habit) => void
  abortTimer: (habitId: number) => void
  finishTimer: (habit: Habit) => Promise<void>
  soundMuted: boolean
  toggleSoundMuted: () => void
  completionNotice: TimerCompletionNotice | null
  dismissCompletionNotice: () => void
}

const HabitTimerContext = createContext<HabitTimerContextValue | null>(null)

const SOUND_MUTE_KEY = 'habitat_timer_muted'

export function HabitTimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Record<number, HabitTimerState>>(() =>
    loadPersistedTimers(getTodayLocal())
  )
  const [now, setNow] = useState<number>(() => Date.now())
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SOUND_MUTE_KEY) === '1'
  })
  const [completionNotice, setCompletionNotice] = useState<TimerCompletionNotice | null>(null)
  const completingIdsRef = useRef<Set<number>>(new Set())

  // Persist timers whenever they change
  useEffect(() => {
    savePersistedTimers(timers)
  }, [timers])

  const hasRunningTimer = useMemo(
    () => Object.values(timers).some((t) => t.isRunning),
    [timers]
  )

  // Tick smoothly every 250ms while any timer is active
  useEffect(() => {
    if (!hasRunningTimer) return
    setNow(Date.now())
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 250)
    return () => window.clearInterval(interval)
  }, [hasRunningTimer])

  // Auto-dismiss completion banner after 5s
  useEffect(() => {
    if (!completionNotice) return
    const t = window.setTimeout(() => setCompletionNotice(null), 5000)
    return () => window.clearTimeout(t)
  }, [completionNotice])

  const triggerCompletionEffects = useCallback(
    async (habitId: number, habitName: string, targetSeconds: number, dateStr: string) => {
      const mins = Math.max(1, Math.round(targetSeconds / 60))
      if (!soundMuted) {
        playTimerCompletionChime()
      }
      setCompletionNotice({
        habitId,
        habitName,
        minutes: mins,
        timestamp: Date.now(),
      })
      await completeHabitForDate(habitId, dateStr, 1)
      void sendNativeNotification(`🔔 Timer Complete: ${habitName}`, {
        body: `Awesome focus! You finished your ${formatDurationHuman(mins)} session.`,
        tag: `habit-timer-done-${habitId}`,
      })
    },
    [soundMuted]
  )

  // Detect any running timer reaching 0
  useEffect(() => {
    const finished: HabitTimerState[] = []
    for (const state of Object.values(timers)) {
      if (!state.isRunning || completingIdsRef.current.has(state.habitId)) continue
      const snap = computeTimerSnapshot(
        state.habitId,
        Math.round(state.targetSeconds / 60),
        state,
        now
      )
      if (snap.remainingSeconds <= 0) {
        finished.push(state)
      }
    }

    if (finished.length === 0) return

    for (const item of finished) {
      completingIdsRef.current.add(item.habitId)
    }

    setTimers((prev) => {
      const next = { ...prev }
      for (const item of finished) {
        delete next[item.habitId]
      }
      return next
    })

    for (const item of finished) {
      void triggerCompletionEffects(
        item.habitId,
        item.habitName,
        item.targetSeconds,
        item.dateStr
      ).finally(() => {
        completingIdsRef.current.delete(item.habitId)
      })
    }
  }, [timers, now, triggerCompletionEffects])

  const startTimer = useCallback((habit: Habit) => {
    if (!habit.id) return
    unlockTimerAudio()

    // Request notification permission politely if default (won't re-prompt if denied/granted)
    if (isNotificationSupported() && Notification.permission === 'default') {
      void requestAppNotificationPermission()
    }

    const todayStr = getTodayLocal()
    const defaultTargetSec = Math.max(1, habit.timerMinutes ?? 15) * 60
    const ts = Date.now()
    setNow(ts)

    setTimers((prev) => {
      const existing = prev[habit.id!]
      if (existing && existing.dateStr === todayStr) {
        if (existing.isRunning) return prev
        return {
          ...prev,
          [habit.id!]: {
            ...existing,
            habitName: habit.name,
            isRunning: true,
            startedAt: ts,
            hasStarted: true,
          },
        }
      }
      return {
        ...prev,
        [habit.id!]: {
          habitId: habit.id!,
          habitName: habit.name,
          dateStr: todayStr,
          targetSeconds: defaultTargetSec,
          elapsedSeconds: 0,
          isRunning: true,
          startedAt: ts,
          hasStarted: true,
        },
      }
    })
  }, [])

  const pauseTimer = useCallback((habitId: number) => {
    const ts = Date.now()
    setNow(ts)
    setTimers((prev) => {
      const existing = prev[habitId]
      if (!existing || !existing.isRunning) return prev
      const runDelta =
        existing.startedAt !== null ? Math.max(0, (ts - existing.startedAt) / 1000) : 0
      return {
        ...prev,
        [habitId]: {
          ...existing,
          elapsedSeconds: Math.min(existing.targetSeconds, existing.elapsedSeconds + runDelta),
          isRunning: false,
          startedAt: null,
        },
      }
    })
  }, [])

  const toggleTimer = useCallback(
    (habit: Habit) => {
      if (!habit.id) return
      const existing = timers[habit.id]
      if (existing && existing.dateStr === getTodayLocal() && existing.isRunning) {
        pauseTimer(habit.id)
      } else {
        startTimer(habit)
      }
    },
    [timers, pauseTimer, startTimer]
  )

  const adjustTime = useCallback((habit: Habit, deltaMinutes: number) => {
    if (!habit.id) return
    const todayStr = getTodayLocal()
    const defaultTargetSec = Math.max(1, habit.timerMinutes ?? 15) * 60
    const ts = Date.now()
    setNow(ts)

    setTimers((prev) => {
      const existing = prev[habit.id!]
      const base: HabitTimerState =
        existing && existing.dateStr === todayStr
          ? existing
          : {
              habitId: habit.id!,
              habitName: habit.name,
              dateStr: todayStr,
              targetSeconds: defaultTargetSec,
              elapsedSeconds: 0,
              isRunning: false,
              startedAt: null,
              hasStarted: true,
            }

      const runDelta =
        base.isRunning && base.startedAt !== null
          ? Math.max(0, (ts - base.startedAt) / 1000)
          : 0
      const currentElapsed = base.elapsedSeconds + runDelta
      const deltaSec = deltaMinutes * 60
      // Keep at least 60s total and at least 15s remaining above elapsed when shrinking
      const minAllowed = Math.max(60, Math.ceil(currentElapsed) + 15)
      const nextTarget = Math.min(480 * 60, Math.max(minAllowed, base.targetSeconds + deltaSec))

      return {
        ...prev,
        [habit.id!]: {
          ...base,
          targetSeconds: nextTarget,
        },
      }
    })
  }, [])

  const resetTimer = useCallback((habit: Habit) => {
    if (!habit.id) return
    const todayStr = getTodayLocal()
    const defaultTargetSec = Math.max(1, habit.timerMinutes ?? 15) * 60
    setNow(Date.now())
    setTimers((prev) => ({
      ...prev,
      [habit.id!]: {
        habitId: habit.id!,
        habitName: habit.name,
        dateStr: todayStr,
        targetSeconds: defaultTargetSec,
        elapsedSeconds: 0,
        isRunning: false,
        startedAt: null,
        hasStarted: true,
      },
    }))
  }, [])

  const abortTimer = useCallback((habitId: number) => {
    setTimers((prev) => {
      if (!(habitId in prev)) return prev
      const next = { ...prev }
      delete next[habitId]
      return next
    })
  }, [])

  const finishTimer = useCallback(
    async (habit: Habit) => {
      if (!habit.id) return
      unlockTimerAudio()
      const todayStr = getTodayLocal()
      const existing = timers[habit.id]
      const targetSec = existing?.targetSeconds ?? Math.max(1, habit.timerMinutes ?? 15) * 60

      setTimers((prev) => {
        const next = { ...prev }
        delete next[habit.id!]
        return next
      })

      await triggerCompletionEffects(habit.id, habit.name, targetSec, todayStr)
    },
    [timers, triggerCompletionEffects]
  )

  const getSnapshot = useCallback(
    (habit: Habit): HabitTimerSnapshot => {
      const id = habit.id ?? -1
      const todayStr = getTodayLocal()
      const state = timers[id]
      const validState = state && state.dateStr === todayStr ? state : undefined
      return computeTimerSnapshot(id, habit.timerMinutes ?? 15, validState, now)
    },
    [timers, now]
  )

  const toggleSoundMuted = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SOUND_MUTE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const dismissCompletionNotice = useCallback(() => {
    setCompletionNotice(null)
  }, [])

  const value = useMemo<HabitTimerContextValue>(
    () => ({
      getSnapshot,
      startTimer,
      pauseTimer,
      toggleTimer,
      adjustTime,
      resetTimer,
      abortTimer,
      finishTimer,
      soundMuted,
      toggleSoundMuted,
      completionNotice,
      dismissCompletionNotice,
    }),
    [
      getSnapshot,
      startTimer,
      pauseTimer,
      toggleTimer,
      adjustTime,
      resetTimer,
      abortTimer,
      finishTimer,
      soundMuted,
      toggleSoundMuted,
      completionNotice,
      dismissCompletionNotice,
    ]
  )

  return <HabitTimerContext.Provider value={value}>{children}</HabitTimerContext.Provider>
}

export function useHabitTimers(): HabitTimerContextValue {
  const ctx = useContext(HabitTimerContext)
  if (!ctx) {
    throw new Error('useHabitTimers must be used inside HabitTimerProvider')
  }
  return ctx
}

