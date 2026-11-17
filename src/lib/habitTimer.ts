// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Drift-Free Habit Focus Timer Engine & Offline Completion Chime
// ─────────────────────────────────────────────────────────────────────────────

export interface HabitTimerState {
  habitId: number
  habitName: string
  dateStr: string
  targetSeconds: number
  elapsedSeconds: number
  isRunning: boolean
  startedAt: number | null
  hasStarted: boolean
}

export interface HabitTimerSnapshot {
  habitId: number
  targetSeconds: number
  elapsedSeconds: number
  remainingSeconds: number
  /** 0..1 fraction of time elapsed */
  progress: number
  isRunning: boolean
  hasStarted: boolean
  isFinished: boolean
}

const TIMERS_STORAGE_KEY = 'habitat_active_timers_v1'

export function loadPersistedTimers(todayStr: string): Record<number, HabitTimerState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TIMERS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, HabitTimerState>
    const valid: Record<number, HabitTimerState> = {}
    for (const [k, state] of Object.entries(parsed)) {
      const id = Number(k)
      if (
        Number.isFinite(id) &&
        state &&
        state.dateStr === todayStr &&
        state.targetSeconds > 0
      ) {
        valid[id] = { ...state, habitId: id }
      }
    }
    return valid
  } catch {
    return {}
  }
}

export function savePersistedTimers(timers: Record<number, HabitTimerState>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers))
  } catch {
    // ignore storage errors
  }
}

export function computeTimerSnapshot(
  habitId: number,
  defaultMinutes: number,
  state?: HabitTimerState,
  now: number = Date.now()
): HabitTimerSnapshot {
  const fallbackTarget = Math.max(1, Math.round(defaultMinutes || 15)) * 60
  if (!state) {
    return {
      habitId,
      targetSeconds: fallbackTarget,
      elapsedSeconds: 0,
      remainingSeconds: fallbackTarget,
      progress: 0,
      isRunning: false,
      hasStarted: false,
      isFinished: false,
    }
  }

  const targetSeconds = Math.max(60, state.targetSeconds)
  const runDelta =
    state.isRunning && state.startedAt !== null
      ? Math.max(0, (now - state.startedAt) / 1000)
      : 0
  const rawElapsed = state.elapsedSeconds + runDelta
  const elapsedSeconds = Math.min(targetSeconds, rawElapsed)
  const remainingSeconds = Math.max(0, targetSeconds - rawElapsed)
  const progress = Math.min(1, Math.max(0, elapsedSeconds / targetSeconds))

  return {
    habitId,
    targetSeconds,
    elapsedSeconds,
    remainingSeconds,
    progress,
    isRunning: state.isRunning && remainingSeconds > 0,
    hasStarted: state.hasStarted,
    isFinished: state.hasStarted && remainingSeconds <= 0,
  }
}

/** Formats seconds as MM:SS (or H:MM:SS when >= 1 hour). */
export function formatTimerClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.ceil(totalSeconds))
  const hours = Math.floor(clamped / 3600)
  const mins = Math.floor((clamped % 3600) / 60)
  const secs = clamped % 60
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Formats a minute count cleanly, e.g. "15 min", "1 hr", "2 hours", "1 hr 30 min". */
export function formatDurationHuman(minutes: number): string {
  const m = Math.max(1, Math.round(minutes))
  if (m < 60) return `${m} ${m === 1 ? 'minute' : 'minutes'}`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (rem === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`
  return `${h}h ${rem}m`
}

/** Formats live timer progress e.g. "04:32 / 15 min" or "15 minutes" when idle. */
export function formatTimerSubtitle(snapshot: HabitTimerSnapshot): string {
  const targetMins = Math.max(1, Math.round(snapshot.targetSeconds / 60))
  if (!snapshot.hasStarted) {
    return formatDurationHuman(targetMins)
  }
  const elapsedMin = Math.floor(snapshot.elapsedSeconds / 60)
  const elapsedSec = Math.floor(snapshot.elapsedSeconds % 60)
  const elapsedFormatted =
    elapsedMin >= 60
      ? formatTimerClock(Math.floor(snapshot.elapsedSeconds))
      : `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`
  return `${elapsedFormatted} / ${formatDurationHuman(targetMins)}`
}

// ─── Offline Web Audio Chime (works on iOS Safari & desktop browsers) ─────────

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new Ctor()
  }
  return sharedAudioCtx
}

/**
 * Unlocks Web Audio on direct user gesture (tap Play) so the timer chime
 * can ring reliably when the countdown finishes later on iOS Safari.
 */
export function unlockTimerAudio(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    // Silent 1-sample buffer unlock
    const buffer = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Plays a crisp, pleasant multi-tone completion bell chime + haptic vibration.
 */
export function playTimerCompletionChime(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([220, 110, 220, 110, 380])
    } catch {
      // ignore vibration errors
    }
  }

  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const now = ctx.currentTime
    // Ascending resonant chime: C5, E5, G5, C6 (repeated softly like a meditation bell)
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.55, vol: 0.24 },
      { freq: 659.25, start: 0.16, dur: 0.55, vol: 0.24 },
      { freq: 783.99, start: 0.32, dur: 0.65, vol: 0.26 },
      { freq: 1046.5, start: 0.5, dur: 1.1, vol: 0.28 },
      { freq: 783.99, start: 1.15, dur: 0.5, vol: 0.18 },
      { freq: 1046.5, start: 1.32, dur: 1.2, vol: 0.25 },
    ]

    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(n.freq, now + n.start)

      gain.gain.setValueAtTime(0.0001, now + n.start)
      gain.gain.exponentialRampToValueAtTime(n.vol, now + n.start + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + n.start)
      osc.stop(now + n.start + n.dur + 0.05)
    }
  } catch {
    // Ignore audio playback errors
  }
}

