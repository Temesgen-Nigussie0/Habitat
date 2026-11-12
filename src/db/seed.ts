import { db } from '../db/db'
import { mapPresetToHabit } from '../lib/stats'

/**
 * Seeds the database with starter habits from onboarding.
 * Called once after onboarding is completed.
 */
export async function seedStarterHabits(habitNames: string[]): Promise<void> {
  const toInsert = habitNames.map(name => ({
    ...mapPresetToHabit(name),
    createdAt: Date.now(),
  }))
  await db.habits.bulkAdd(toInsert)
}

