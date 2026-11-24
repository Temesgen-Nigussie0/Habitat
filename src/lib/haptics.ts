// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Tactile Haptic Micro-Feedback Utility
// ─────────────────────────────────────────────────────────────────────────────

export type HapticStyle = 'light' | 'medium' | 'success' | 'error'

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 12,
  medium: 24,
  success: [16, 45, 28],
  error: [25, 35, 25, 35, 20],
}

export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(PATTERNS[style])
  } catch {
    // Ignore vibration restrictions on unsupported browsers
  }
}
