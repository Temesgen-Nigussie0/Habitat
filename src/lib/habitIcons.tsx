import {
  Droplets,
  BookOpen,
  Sparkles,
  Dumbbell,
  Target,
  Sun,
  Moon,
  Utensils,
  Code2,
  type LucideIcon,
} from 'lucide-react'

export interface HabitIconOption {
  key: string
  label: string
  Icon: LucideIcon
}

export const HABIT_ICONS: HabitIconOption[] = [
  { key: 'water', label: 'Water', Icon: Droplets },
  { key: 'book', label: 'Book', Icon: BookOpen },
  { key: 'meditation', label: 'Mind', Icon: Sparkles },
  { key: 'workout', label: 'Workout', Icon: Dumbbell },
  { key: 'target', label: 'Target', Icon: Target },
  { key: 'sunlight', label: 'Sunlight', Icon: Sun },
  { key: 'sleep', label: 'Sleep', Icon: Moon },
  { key: 'meal', label: 'Meal', Icon: Utensils },
  { key: 'code', label: 'Code', Icon: Code2 },
]

export const HABIT_COLORS = [
  '#FF6A00', // Orange
  '#FF9F0A', // Amber
  '#30D158', // Green
  '#0A84FF', // Blue
  '#BF5AF2', // Purple
  '#FF453A', // Red
  '#64D2FF', // Cyan
  '#FFD60A', // Gold
]

export function getHabitIconComponent(iconName: string): LucideIcon {
  const found = HABIT_ICONS.find((i) => i.key === iconName)
  return found ? found.Icon : Target
}

interface HabitIconProps {
  iconName: string
  color?: string
  size?: number
  className?: string
}

export function HabitIcon({ iconName, color = '#FF6A00', size = 24, className }: HabitIconProps) {
  const IconComponent = getHabitIconComponent(iconName)
  return <IconComponent size={size} color={color} className={className} strokeWidth={2.2} />
}

