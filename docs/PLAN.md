# Habitat — Build Plan

## Phase 0 — Foundation (DONE ✅)

### What was built
- [x] Vite + React + TypeScript scaffold (manual, no create-vite — it cancelled on existing files)
- [x] Tailwind CSS v4 (CSS-first config via `@theme` in `src/index.css`)
- [x] All brand colour tokens as Tailwind utilities (`bg-orange`, `text-text-primary`, etc.)
- [x] PWA setup: `vite-plugin-pwa`, web manifest, offline workbox caching
- [x] iPhone PWA installable: `apple-mobile-web-app-capable`, `viewport-fit=cover`, `apple-touch-icon`, safe-area padding via `env(safe-area-inset-*)`
- [x] `theme-color: #070709`, `background_color: #000000`, `display: standalone`
- [x] `navigator.storage.persist()` called on first launch
- [x] `vercel.json` SPA rewrite rule
- [x] react-router-dom with 5 routes: `/`, `/tasks`, `/boss`, `/analytics`, `/profile`
- [x] Shared components: `BottomNav`, `Screen`, `Card`, `Chip`, `ProgressBar`, `ProgressRing`, `FAB`, `SectionLabel`
- [x] 5 styled screen shells: Today, Tasks, Boss Mode, Analytics, Profile
  - Each has the real design language: colours, typography, spacing, card styles
  - Today: week strip, completion card, filter chips, placeholder habit cards with correct layout
  - Tasks: timeline, day strip, bento grid (white/orange), month picker
  - Boss Mode: explanation cards, duration chips, CTA
  - Analytics: stat cards, hand-drawn SVG heatmap, diamond radar chart, production domains, freeze vault
  - Profile: banner, avatar, bio, occupation chips, stat cards, lifestyle blueprint
- [x] Dexie database: 6 tables (`habits`, `habitEntries`, `tasks`, `userProfile`, `bossChallenges`, `streakFreezes`)
- [x] Dexie hooks (`useHabits`, `useHabitEntries`, `useTasks`, `useUserProfile`, etc.)
- [x] Full CRUD actions for all tables (`src/db/actions.ts`)
- [x] Streak calculator (`src/lib/streak.ts`) — TypeScript port of `StreakCalculator.kt` with 3 fixes:
  - Frequency awareness (DAILY/WEEKDAYS/WEEKENDS/CUSTOM)
  - Freeze dates honoured
  - Today unfinished never breaks streak
- [x] Stats helpers (`src/lib/stats.ts`): daily %, isFuture, isToday, getCounterDisplay, mapPresetToHabit
- [x] Export/import backup (`src/lib/backup.ts`) — functions only, no UI yet
- [x] Seed function (`src/db/seed.ts`) — called after onboarding
- [x] Vitest tests (`src/test/streak.test.ts`) — full test suite for streak logic, frequency, freezes, stats, timezone
- [x] `docs/REFERENCE-NOTES.md` — complete reference of all Android screens, models, colours, patterns
- [x] `README.md` with run/deploy steps

### Key decisions
- Added `customDays` field to `Habit` interface (not in Android model) — required for CUSTOM frequency streak logic
- Added `streakFreezes` table (planned in Android but never implemented)
- Used Tailwind v4 CSS-first config (not `tailwind.config.js`) — `@tailwindcss/vite` plugin
- Manual scaffold (not `create-vite`) because target directory had existing files
- Placeholder icon PNGs (1px orange pixel) — real icons in a future phase
- Screens use hardcoded placeholder data — connected to Dexie in Phase 1

---

## Phase 1 — Core Today Screen & Onboarding (DONE ✅)

### What was built
- [x] Onboarding route `/onboarding` with route guard in `src/App.tsx` + branded splash while IndexedDB loads
- [x] Compressed hero image `public/hero_habit_onboard.jpg` (27 KB)
- [x] Welcome screen + Questions 1–10 with `framer-motion` slide transitions, Back navigation preserving answers, Q6 starter habit picker (min 2, max 4), Q10 2-second press-and-hold ring animation, and Final Calibration (name, headline, occupations + custom occupation)
- [x] `completeOnboarding()` saves `UserProfile` and seeds chosen starter habits via `mapPresetToHabit()`
- [x] Today screen (`src/screens/TodayScreen.tsx`) wired to live Dexie `useLiveQuery` data
- [x] Header view switcher (`Habit Grid` / `Routine Circuit` persisted in `localStorage`), greeting, and max streak pill
- [x] Week strip (Mon–Sun) with past day selection and locked future days + toast
- [x] Progress card with frequency-aware `getDailyCompletionPercent()`
- [x] Habit cards (`src/components/HabitCard.tsx`) with `lucide-react` icon chips, boolean & counter (`0/8`) completion, expandable `Hydration Wave` drawer for water habits, pointer-event swipe right/left with `touch-action: pan-y`, and collapsed `COMPLETED (n)` section
- [x] `HabitStackCircuitView` (`src/components/HabitStackCircuitView.tsx`) sequential timeline view
- [x] `AddEditHabitSheet` (`src/components/AddEditHabitSheet.tsx`) bottom sheet with all fields including `FREQUENCY` (Every day, Weekdays, Weekends, Custom days) and streak recalculation on edit
- [x] `HabitDetailSheet` (`src/components/HabitDetailSheet.tsx`) with streaks, total logged, daily goal, 30-day dot row, Edit, and confirmed Delete
- [x] `ParticleCelebration` (`src/components/ParticleCelebration.tsx`) 1.5s burst once per day when all habits complete, respecting `prefers-reduced-motion`
- [x] Vitest tests (`src/test/phase1.test.ts`) for onboarding, counter habits, locked future days, and weekday-on-Saturday progress

---

## Phase 2 — Tasks Screen (Done)

### Goals
- [x] Tasks screen: live Dexie data
- [x] Add/Edit Task dialog: all fields (title with `"Untitled Task"` fallback if blank, priority, workspace, category, fixed/range due dates, delete confirmation)
- [x] All 3 view modes: BENTO, EISENHOWER, KANBAN
- [x] Toggle task completion (`SHIPPED` <-> `isCompleted` sync)
- [x] Kanban tap to advance/move status across columns
- [x] Search and filter working (priority, workspace, search across title/workspace/notes)
- [x] Workspace creation persisted in `userProfile.workspaces`

---

## Phase 3 — Analytics & Profile (Done)

### Goals
- [x] Analytics: 18-week SVG/grid heatmap with real entry & task `completedAt` local-date counts
- [x] Analytics: diamond radar chart with real pillar data (Dev, Video, Academics+University, Vitality, 0% floor when empty)
- [x] Analytics: stat cards wired to frequency-aware 7-day habit rate, tasks done, and total actions
- [x] Analytics: Production Domains, Milestone Badges, Smart Habit Scheduler, Push Notification Test Lab
- [x] Profile: edit bio/name/headline/occupations sheet
- [x] Profile: avatar & banner photo crop/zoom/tilt dialog (`<canvas>` JPEG 0.8 data URL in IndexedDB)
- [x] Profile: Lifestyle Blueprint, Quick Habit Library (20 curated 1-tap habits), Retake Onboarding (keeps data)
- [x] Profile: backup export (Web Share API / download) & import preview/restore UI + double-confirm Erase All Data
- [x] Streak Freeze Vault: "Freeze Day" button calls `activateStreakFreeze()` and protects streaks in `streak.ts`

---

## Phase 4 — Polish, Safety & Install Quality (Done — Boss Mode postponed)

### Goals
- [x] Install quality: manifest `#070709`, iOS dark splash (`html, body` `#070709`), `touch-action: manipulation`, `maximum-scale=1`
- [x] Safe updates: `registerType: 'prompt'` + `cleanupOutdatedCaches: true` + `"New version ready · Tap to update"` banner
- [x] Data safety: Storage status (`persisted()` + `estimate()`), 14-day backup nudge, `lastBeforeRestore` safety snapshot + `"Undo last import"`, strict import validation
- [x] Robustness: Per-screen `ScreenErrorBoundary` (`"Reload screen"` + `"Export backup"`), IndexedDB blocked notice, date edge tests
- [x] UX & Touch audit: `44px` tap targets, `16px` inputs, `-webkit-touch-callout: none`, loading skeletons, `"About Habitat"` footer
- [ ] Boss Mode (postponed — Under Construction screen kept as-is)

---

## Technical Decisions Log

| Decision | Reason |
|---|---|
| Tailwind v4 CSS-first config | `@tailwindcss/vite` plugin requires this; no `tailwind.config.js` needed |
| `customDays` field on Habit | CUSTOM frequency needs to know which weekdays; not in Android model but required |
| `streakFreezes` as a separate table | Cleaner than storing freeze dates on habits; supports global freezes |
| `env(safe-area-inset-*)` via inline styles | Tailwind v4 doesn't yet support arbitrary safe-area values in utility classes |
| Dates as local `yyyy-MM-dd` strings | User in UTC+3 (Addis Ababa); UTC dates would shift midnight |
| No UTC date methods | All date formatting goes through `formatLocalDate()` using `getFullYear()`, `getMonth()`, `getDate()` |
| Placeholder 1px PNGs for icons | Real icons require a design asset; placeholder is enough for PWA manifest validation |

