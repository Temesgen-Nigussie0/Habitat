// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Time-of-Day Dynamic Ambient Mood Glow
// ─────────────────────────────────────────────────────────────────────────────

export type AmbientPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

export interface AmbientMood {
  period: AmbientPeriod
  gradient: string
}

export function getAmbientMood(
  hour: number = new Date().getHours(),
  accentRgb: string = '255, 106, 0'
): AmbientMood {
  if (hour >= 5 && hour < 12) {
    // Morning: warm sunrise amber-gold + accent
    return {
      period: 'morning',
      gradient: `radial-gradient(ellipse 90% 65% at 50% -10%, rgba(255, 179, 71, 0.16) 0%, rgba(${accentRgb}, 0.08) 45%, transparent 80%)`,
    }
  }
  if (hour >= 12 && hour < 18) {
    // Afternoon: crisp energetic accent glow
    return {
      period: 'afternoon',
      gradient: `radial-gradient(ellipse 85% 60% at 50% -10%, rgba(${accentRgb}, 0.15) 0%, rgba(${accentRgb}, 0.04) 55%, transparent 80%)`,
    }
  }
  if (hour >= 18 && hour < 22) {
    // Evening: warm sunset ember + subtle rose
    return {
      period: 'evening',
      gradient: `radial-gradient(ellipse 90% 65% at 50% -10%, rgba(${accentRgb}, 0.16) 0%, rgba(191, 90, 242, 0.06) 52%, transparent 82%)`,
    }
  }
  // Night: deep midnight indigo + subtle accent core
  return {
    period: 'night',
    gradient: `radial-gradient(ellipse 90% 65% at 50% -10%, rgba(56, 189, 248, 0.11) 0%, rgba(${accentRgb}, 0.08) 45%, transparent 82%)`,
  }
}
