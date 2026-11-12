import type { Habit } from '../db/types'

export interface CuratedQuickHabit {
  name: string
  category: string
  emoji: string
  iconName: string
  colorHex: string
  targetCount: number
  unit: string
  timeOfDay: string
}

export const CURATED_QUICK_HABITS: CuratedQuickHabit[] = [
  { name: 'Drink 2L Water', category: 'Health', emoji: '💧', iconName: 'water', colorHex: '#3B82F6', targetCount: 8, unit: 'glasses', timeOfDay: 'All Day' },
  { name: '10,000 Steps', category: 'Fitness', emoji: '👟', iconName: 'walk', colorHex: '#10B981', targetCount: 10000, unit: 'steps', timeOfDay: 'All Day' },
  { name: 'Morning Meditation', category: 'Mindfulness', emoji: '🧘', iconName: 'meditation', colorHex: '#8B5CF6', targetCount: 1, unit: 'session', timeOfDay: 'Morning' },
  { name: 'Read 20 Pages', category: 'Learning', emoji: '📖', iconName: 'book', colorHex: '#F59E0B', targetCount: 20, unit: 'pages', timeOfDay: 'Evening' },
  { name: 'Cold Shower', category: 'Discipline', emoji: '🚿', iconName: 'shower', colorHex: '#06B6D4', targetCount: 1, unit: 'session', timeOfDay: 'Morning' },
  { name: '30-Min Workout', category: 'Fitness', emoji: '🏋️', iconName: 'workout', colorHex: '#EF4444', targetCount: 1, unit: 'session', timeOfDay: 'Morning' },
  { name: 'No Sugar Day', category: 'Nutrition', emoji: '🥗', iconName: 'nutrition', colorHex: '#EC4899', targetCount: 1, unit: 'day', timeOfDay: 'All Day' },
  { name: 'Daily Journaling', category: 'Mindfulness', emoji: '✍️', iconName: 'journal', colorHex: '#6366F1', targetCount: 1, unit: 'entry', timeOfDay: 'Evening' },
  { name: 'Sleep 8 Hours', category: 'Recovery', emoji: '😴', iconName: 'sleep', colorHex: '#818CF8', targetCount: 8, unit: 'hours', timeOfDay: 'Night' },
  { name: 'Deep Work Block', category: 'Productivity', emoji: '⚡', iconName: 'focus', colorHex: '#F97316', targetCount: 90, unit: 'minutes', timeOfDay: 'Morning' },
  { name: 'Code for 1 Hour', category: 'Skill', emoji: '💻', iconName: 'code', colorHex: '#0284C7', targetCount: 60, unit: 'minutes', timeOfDay: 'Afternoon' },
  { name: 'Stretching & Mobility', category: 'Fitness', emoji: '🤸', iconName: 'stretch', colorHex: '#14B8A6', targetCount: 15, unit: 'minutes', timeOfDay: 'Morning' },
  { name: 'Take Daily Vitamins', category: 'Health', emoji: '💊', iconName: 'vitamins', colorHex: '#22C55E', targetCount: 1, unit: 'dose', timeOfDay: 'Morning' },
  { name: "Plan Tomorrow's Tasks", category: 'Productivity', emoji: '📝', iconName: 'plan', colorHex: '#A855F7', targetCount: 1, unit: 'review', timeOfDay: 'Evening' },
  { name: '3 Gratitudes Practice', category: 'Mindfulness', emoji: '🙏', iconName: 'gratitude', colorHex: '#F43F5E', targetCount: 3, unit: 'items', timeOfDay: 'Morning' },
  { name: 'Learn Language 15m', category: 'Learning', emoji: '🌍', iconName: 'language', colorHex: '#3B82F6', targetCount: 15, unit: 'minutes', timeOfDay: 'Afternoon' },
  { name: '20-Min Nature Walk', category: 'Mindfulness', emoji: '🌲', iconName: 'walk', colorHex: '#10B981', targetCount: 20, unit: 'minutes', timeOfDay: 'Afternoon' },
  { name: 'Limit Screen Time (<2h)', category: 'Discipline', emoji: '📵', iconName: 'digital', colorHex: '#D97706', targetCount: 1, unit: 'day', timeOfDay: 'Evening' },
  { name: 'Floss & Dental Care', category: 'Health', emoji: '🦷', iconName: 'floss', colorHex: '#0EA5E9', targetCount: 1, unit: 'time', timeOfDay: 'Night' },
  { name: 'Clean Workspace', category: 'Environment', emoji: '🧹', iconName: 'clean', colorHex: '#64748B', targetCount: 1, unit: 'session', timeOfDay: 'Evening' },
]

interface QuickHabitsLibraryProps {
  allHabits: Habit[]
  onAddHabit: (habitDef: CuratedQuickHabit) => Promise<void> | void
}

export default function QuickHabitsLibrary({
  allHabits,
  onAddHabit,
}: QuickHabitsLibraryProps) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#FF6A00]">
        QUICK HABIT LIBRARY (1-TAP ADD)
      </p>
      <p className="mt-1 text-[12px] text-[#A1A1AA]">
        Tap any habit below to instantly add it to your Today home dashboard:
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {CURATED_QUICK_HABITS.map((habitDef) => {
          const isAdded = allHabits.some(
            (h) => h.name.trim().toLowerCase() === habitDef.name.toLowerCase()
          )

          return (
            <button
              key={habitDef.name}
              type="button"
              disabled={isAdded}
              onClick={() => onAddHabit(habitDef)}
              className={`flex w-full items-center justify-between gap-3 rounded-[14px] border bg-[#161618] px-3.5 py-3 text-left transition-transform ${
                isAdded
                  ? 'border-[#30D158]/50'
                  : 'border-[#242428] active:scale-[0.99]'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="text-[22px] leading-none">{habitDef.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#F5F5F7]">
                    {habitDef.name}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    <span className="font-medium text-[#FF6A00]">
                      {habitDef.category}
                    </span>
                    <span className="text-[#8E8E93]">
                      {' '}
                      • {habitDef.timeOfDay}
                    </span>
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-[10px] border px-2.5 py-1.5 text-[12px] font-bold ${
                  isAdded
                    ? 'border-[#30D158]/60 bg-[#30D158]/15 text-[#30D158]'
                    : 'border-[#FF6A00] bg-[#FF6A00]/15 text-[#FF6A00]'
                }`}
              >
                {isAdded ? 'Added ✓' : '+ Add'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

