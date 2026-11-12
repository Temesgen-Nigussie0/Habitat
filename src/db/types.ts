// ─────────────────────────────────────────────────────────────
// Habitat — TypeScript type definitions (mirrors the Android Room models)
// ─────────────────────────────────────────────────────────────

export interface Habit {
  id?: number
  name: string
  /** Health | Mind | Productivity | Energy | Routine | Night | Engineering | Sleep | General */
  category: string
  /** water | book | meditation | workout | target | sunlight | sleep | meal | code */
  iconName: string
  colorHex: string
  targetCount: number
  unit: string
  /** Morning | Afternoon | Evening | Anytime */
  timeOfDay: string
  /** DAILY | WEEKDAYS | WEEKENDS | CUSTOM */
  frequency: string
  /** Comma-separated day numbers (0=Sun … 6=Sat) used when frequency === 'CUSTOM' */
  customDays: string
  currentStreak: number
  bestStreak: number
  lastCompletedDate: string | null
  createdAt: number
  isArchived: boolean
}

export interface HabitEntry {
  id?: number
  habitId: number
  /** yyyy-MM-dd local date */
  date: string
  currentCount: number
  targetCount: number
  isCompleted: boolean
  completedAt: number
  notes: string | null
}

export interface Task {
  id?: number
  title: string
  notes: string | null
  /** Software Dev | Video & Photo | University | Client Work | Personal */
  category: string
  /** Urgent | High | Medium | Low */
  priority: string
  /** Short-Term | Long-Term | Milestone */
  scope: string
  dueDate: string | null
  endDate: string | null
  dailyTimeline: string | null
  estimatedHours: number
  clientOrCourse: string | null
  tags: string
  /** TODO | IN_PROGRESS | REVIEW | SHIPPED */
  kanbanStatus: string
  isCompleted: boolean
  completedAt: number | null
  createdAt: number
}

export interface UserProfile {
  id: number  // always 1 (singleton)
  userName: string
  headline: string
  bio: string
  bannerUri: string | null
  avatarUri: string | null
  focusArea: string
  currentConsistency: string
  frictionHurdle: string
  targetHabitLoad: string
  primeZone: string
  starterHabits: string
  motivationStyle: string
  timeCommitment: string
  briefingTime: string
  pledgeAccepted: boolean
  isOnboardingCompleted: boolean
  occupations: string
  workspaces: string
  streakFreezesAvailable: number
  streakFreezesUsed: number
  isComebackProtocolActive: boolean
  lastFreezeDate: string | null
  smartSchedulerEnabled?: boolean
  smartScheduleTimes?: string
  lastExportedAt?: number | null
  joinedAt: number
}

export interface BossChallenge {
  id?: number
  title: string
  targetHabitIds: string
  durationDays: number
  /** Hard | Extreme | Legendary */
  intensity: string
  punishment: string
  startDate: string
  endDate: string
  currentDayNumber: number
  completedDays: number
  missedDays: number
  isActive: boolean
  isFailed: boolean
  isCompleted: boolean
  quitReason: string | null
  createdAt: number
}

export interface StreakFreeze {
  id?: number
  /** The date this freeze protects */
  date: string
  /** null = global (all habits that day) */
  habitId: number | null
  createdAt: number
}

