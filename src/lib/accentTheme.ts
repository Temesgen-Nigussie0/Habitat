// ─────────────────────────────────────────────────────────────────────────────
// Habitat — Unlockable Custom App Accent Themes
// ─────────────────────────────────────────────────────────────────────────────

export interface AccentTheme {
  id: string
  name: string
  primary: string
  neon: string
  bright: string
  deep: string
  rgb: string
  unlockLabel: string
  minBestStreak: number
  minCompletions: number
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'obsidian-orange',
    name: 'Obsidian Orange',
    primary: '#FF6A00',
    neon: '#FF7A1A',
    bright: '#FF8C38',
    deep: '#E65100',
    rgb: '255, 106, 0',
    unlockLabel: 'Default',
    minBestStreak: 0,
    minCompletions: 0,
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    primary: '#FFB800',
    neon: '#FFC933',
    bright: '#FFD866',
    deep: '#CC9300',
    rgb: '255, 184, 0',
    unlockLabel: '3d streak or 3 logs',
    minBestStreak: 3,
    minCompletions: 3,
  },
  {
    id: 'cyber-mint',
    name: 'Cyber Mint',
    primary: '#10B981',
    neon: '#34D399',
    bright: '#6EE7B7',
    deep: '#059669',
    rgb: '16, 185, 129',
    unlockLabel: '7d streak or 10 logs',
    minBestStreak: 7,
    minCompletions: 10,
  },
  {
    id: 'electric-ice',
    name: 'Electric Ice',
    primary: '#0EA5E9',
    neon: '#38BDF8',
    bright: '#7DD3FC',
    deep: '#0284C7',
    rgb: '14, 165, 233',
    unlockLabel: '14d streak or 25 logs',
    minBestStreak: 14,
    minCompletions: 25,
  },
  {
    id: 'crimson-forge',
    name: 'Crimson Forge',
    primary: '#F43F5E',
    neon: '#FB7185',
    bright: '#FDA4AF',
    deep: '#E11D48',
    rgb: '244, 63, 94',
    unlockLabel: '21d streak or 50 logs',
    minBestStreak: 21,
    minCompletions: 50,
  },
]

const THEME_STORAGE_KEY = 'habitat_accent_theme'

export function isAccentThemeUnlocked(
  theme: AccentTheme,
  bestStreak: number,
  totalCompletions: number
): boolean {
  if (theme.minBestStreak === 0 && theme.minCompletions === 0) return true
  return bestStreak >= theme.minBestStreak || totalCompletions >= theme.minCompletions
}

export function getAccentThemeById(id?: string | null): AccentTheme {
  return ACCENT_THEMES.find((t) => t.id === id) ?? ACCENT_THEMES[0]
}

export function getSelectedAccentTheme(): AccentTheme {
  if (typeof window === 'undefined') return ACCENT_THEMES[0]
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return getAccentThemeById(saved)
  } catch {
    return ACCENT_THEMES[0]
  }
}

export function applyAccentTheme(theme: AccentTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement.style
  root.setProperty('--color-orange', theme.primary)
  root.setProperty('--color-orange-neon', theme.neon)
  root.setProperty('--color-orange-bright', theme.bright)
  root.setProperty('--color-orange-deep', theme.deep)
  root.setProperty('--accent-rgb', theme.rgb)
}

export function selectAndApplyAccentTheme(themeId: string): AccentTheme {
  const theme = getAccentThemeById(themeId)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id)
    } catch {
      // ignore
    }
  }
  applyAccentTheme(theme)
  return theme
}
