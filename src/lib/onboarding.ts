import type { UserProfile } from '../db/types'

export interface OnboardingOption {
  title: string
  subtitle: string
  emoji: string
  badge?: string
}

export const Q1_FOCUS_OPTIONS: OnboardingOption[] = [
  { title: 'Physical Vitality', subtitle: 'Energy, strength, movement & nutrition', emoji: '🏃‍♂️' },
  { title: 'Mental Clarity', subtitle: 'Mindfulness, stress reduction & peace', emoji: '🧠' },
  { title: 'Peak Productivity', subtitle: 'Deep work, focus & ruthless execution', emoji: '⚡' },
  { title: 'Morning & Evening Flow', subtitle: 'Wake up energized & wind down smoothly', emoji: '🌅' },
  { title: 'Continuous Learning', subtitle: 'Reading, new skills & personal growth', emoji: '📚' },
]

export const Q2_CONSISTENCY_OPTIONS: OnboardingOption[] = [
  { title: 'Starting fresh', subtitle: 'Ready to build from scratch with a clean slate', emoji: '🌱' },
  { title: 'Hot and cold', subtitle: 'I start strong for a week, then lose momentum', emoji: '🔄' },
  { title: 'Fairly steady', subtitle: 'I have some solid basics, but want better tracking', emoji: '🎯' },
  { title: 'High performer', subtitle: 'Looking to stack advanced micro-habits to excel', emoji: '🔥' },
]

export const Q3_HURDLE_OPTIONS: OnboardingOption[] = [
  { title: 'Not enough time', subtitle: 'Days get cluttered with unexpected urgent tasks', emoji: '⏳' },
  { title: 'Motivation dips after days', subtitle: 'Excitement fades when initial novelty wears off', emoji: '📉' },
  { title: 'Forgetting without reminders', subtitle: 'I intend to do it, but simply forget by night', emoji: '🔔' },
  { title: 'Feeling overwhelmed', subtitle: 'Taking on too much at once and burning out', emoji: '🌊' },
]

export const Q4_HABIT_LOAD_OPTIONS: OnboardingOption[] = [
  { title: '1-2 Micro Habits', subtitle: 'Easy early wins to establish discipline', emoji: '✨' },
  {
    title: '3-4 Balanced Routine',
    subtitle: 'The gold standard for sustainable lifestyle shift',
    emoji: '⚖️',
    badge: 'RECOMMENDED',
  },
  { title: '5+ High Performance Stack', subtitle: 'Total daily transformation across all domains', emoji: '🚀' },
]

export const Q5_PRIME_TIME_OPTIONS: OnboardingOption[] = [
  { title: 'Early Morning (6:00 - 9:00 AM)', subtitle: 'Win the morning before distractions start', emoji: '🌅' },
  { title: 'Midday Power (11:00 AM - 2:00 PM)', subtitle: 'Re-energize and conquer the afternoon', emoji: '☀️' },
  { title: 'Evening Wind-down (7:00 - 10:00 PM)', subtitle: 'Reflective quiet ritual before deep sleep', emoji: '🌙' },
  { title: 'Flexible Throughout the Day', subtitle: 'Micro-actions interspersed as time allows', emoji: '⚡' },
]

export const Q6_STARTER_HABITS: OnboardingOption[] = [
  { title: 'Drink 2L Water', subtitle: 'Hydration baseline (8 glasses)', emoji: '💧' },
  { title: 'Read 15 Pages', subtitle: 'Non-fiction or inspiring books', emoji: '📖' },
  { title: '10 Min Meditation', subtitle: 'Breathwork & calm focus', emoji: '🧘' },
  { title: '30 Min Exercise / Walk', subtitle: 'Cardio, weights, or brisk steps', emoji: '🏃' },
  { title: 'Plan Top 3 Priorities', subtitle: 'Decide non-negotiables first', emoji: '📝' },
  { title: 'No Screens 30m Before Bed', subtitle: 'Protect deep REM sleep', emoji: '📵' },
  { title: 'Healthy Home Meal', subtitle: 'Whole ingredients & nourishment', emoji: '🥗' },
  { title: '5 Min Morning Sunlight', subtitle: 'Circadian melatonin reset', emoji: '☀️' },
]

export const Q7_MOTIVATION_OPTIONS: OnboardingOption[] = [
  {
    title: 'Streak Counter & Heatmaps',
    subtitle: 'Seeing uninterrupted chains gives me pure satisfaction',
    emoji: '🔥',
  },
  {
    title: 'Completion % & Weekly Graphs',
    subtitle: 'Data-driven progress bars and consistency ratios',
    emoji: '📊',
  },
  {
    title: 'Milestones & Achievement Badges',
    subtitle: 'Unlocking levels, trophies, and milestones',
    emoji: '🏆',
  },
  {
    title: 'Minimalist Clean Checklist',
    subtitle: 'No clutter: just a crisp, peaceful daily checklist',
    emoji: '✅',
  },
]

export const Q8_TIME_COMMITMENT_OPTIONS: OnboardingOption[] = [
  { title: '5 - 10 minutes', subtitle: 'Micro-actions with massive compound interest', emoji: '⚡' },
  { title: '15 - 30 minutes', subtitle: 'A solid daily foundation for lasting change', emoji: '⏱️' },
  { title: '45+ minutes', subtitle: 'Deep transformation and high-focus rituals', emoji: '🔥' },
]

export const Q9_BRIEFING_TIMES: OnboardingOption[] = [
  { title: '06:30 AM', subtitle: 'Early Bird', emoji: '⏰' },
  { title: '07:30 AM', subtitle: 'Morning Kickoff', emoji: '⏰' },
  { title: '08:30 AM', subtitle: 'Workday Start', emoji: '⏰' },
  { title: '12:30 PM', subtitle: 'Midday Reset', emoji: '⏰' },
  { title: '08:00 PM', subtitle: 'Evening Check-in', emoji: '⏰' },
  { title: '09:30 PM', subtitle: 'Bedtime Review', emoji: '⏰' },
]

export const DEFAULT_OCCUPATIONS: string[] = [
  'Computer Science',
  'Client Freelancer',
  'Visual Creator',
  'Software Dev',
  'UI/UX Design',
  'University Academics',
  'Founder / Business',
  'Health & Fitness',
]

export interface OnboardingFormState {
  focusArea: string
  currentConsistency: string
  frictionHurdle: string
  targetHabitLoad: string
  primeZone: string
  selectedHabits: string[]
  motivationStyle: string
  timeCommitment: string
  briefingTime: string
  pledgeAccepted: boolean
  userName: string
  headline: string
  selectedOccupations: string[]
}

export function toggleStarterHabitSelection(current: string[], habitTitle: string): string[] {
  if (current.includes(habitTitle)) {
    return current.filter((h) => h !== habitTitle)
  }
  if (current.length >= 4) {
    return current // Block a 5th selection
  }
  return [...current, habitTitle]
}

export function buildProfileFromOnboarding(state: OnboardingFormState): Partial<UserProfile> {
  const finalOccupations = state.selectedOccupations.filter((o) => o.trim().length > 0)
  const occupationsString =
    finalOccupations.length > 0
      ? finalOccupations.join(', ')
      : 'Computer Science, Client Freelancer, Visual Creator'

  const fallbackHeadline =
    finalOccupations.length > 0
      ? finalOccupations.slice(0, 2).join(' & ')
      : 'CS Student & Visual Creator'

  return {
    userName: state.userName.trim() || 'Alex',
    headline: state.headline.trim() || fallbackHeadline,
    occupations: occupationsString,
    focusArea: state.focusArea || 'Physical Vitality',
    currentConsistency: state.currentConsistency || 'Starting fresh',
    frictionHurdle: state.frictionHurdle || 'Not enough time',
    targetHabitLoad: state.targetHabitLoad || '3-4 Balanced Routine',
    primeZone: state.primeZone || 'Early Morning (6:00 - 9:00 AM)',
    starterHabits: state.selectedHabits.join(','),
    motivationStyle: state.motivationStyle || 'Streak Counter & Heatmaps',
    timeCommitment: state.timeCommitment || '15 - 30 minutes',
    briefingTime: state.briefingTime || '07:30 AM',
    pledgeAccepted: state.pledgeAccepted,
    isOnboardingCompleted: true,
  }
}

