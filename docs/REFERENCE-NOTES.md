# Habitat — Reference Notes

> Compiled from `_reference/forge-android/` Kotlin/Jetpack Compose source code and 7 UI screenshots.
> This document is the single source of truth for all phases. When in doubt, screenshots win.

---

## 1. Screens (5 total)

### Today (Home)
**Route:** `/`

The main daily dashboard. Shown in screenshot photo_5.

**Header:**
- Left: 2×2 grid icon button (orange tinted rounded square, `#FF6A00` border)
- Beside it: Section label "TODAY'S RHYTHM" (orange, uppercase, bold, wide tracking) + "Hello, [name]" title below
- Right: "🔥 Daily Streak" pill button (orange tinted, orange border)

**Week Strip:**
- 7 day chips (Mon–Sun), centred around today
- Today = solid orange fill, white text
- Past days = dark surface, white day number
- Future days = dark surface + lock icon (no day number visible)
- Format: Letter (M T W T F S S) + day number

**Completion Card:**
- Dark surface card with 28px radius border
- Large text: "0 of N completed"
- Sub-text: "0% of daily target achieved"
- Right: orange flame icon in a tinted circle
- Below: thin orange progress bar

**Time-of-Day Filter Chips (fully rounded pills):**
- All | Morning | Afternoon | Evening
- Selected = solid orange + white text

**Habit Cards:**
- Dark surface card, 20px radius
- Left: habit icon chip (emoji or icon, 56×56 rounded square, tinted background + border in habit colour)
- Middle: habit name (bold, 15sp), category chip, • time-of-day
- Right: for counter habits (targetCount > 1) = `ProgressRing` showing "currentCount/targetCount"; for boolean = circle outline 44px
- Tapping toggles completion (or increments counter)

**FAB:** Orange `+` button, bottom right

---

### Tasks
**Route:** `/tasks`

Task management with 3 view modes. Shown in screenshot photo_6.

**Header:**
- Left: Grid icon button with orange 2px border (opens view mode dropdown)
- Right: Search bar in dark elevated input

**Timeline:**
- "Your Timeline" title + month dropdown picker (orange text + chevron)
- Horizontal scrollable day strip: each day chip shows day number + 3-letter day name; selected = orange

**Priority Matrix:**
- Label: "Priority Matrix" + "[N] Urgent/High • [N] Total"
- **Left column (white card):** "Low Priority Tasks" — white background `#F2F2F5`, black text
- Below left: "Daily Task" dark card with circular progress ring (% done)
- **Right column (orange card):** "Medium Priority Tasks" — solid orange background, white text

**Today's Task list:**
- Sorted: uncompleted first (Urgent → High → Medium → Low), then completed at bottom
- Each card shows: priority badge, title, due date, overdue warning in red if past

**View Modes** (from dropdown):
1. **BENTO** (default) — Timeline strip + priority columns
2. **EISENHOWER** — 4-quadrant Urgent/Important matrix
3. **KANBAN** — TODO | IN_PROGRESS | REVIEW | SHIPPED columns

**FAB:** Orange `+` to add task

---

### Boss Mode
**Route:** `/boss`

High-stakes challenge mode. Accessed via central flame button.

**Concept:** User sets a challenge with a "punishment" for failure (a real personal cost). The app tracks daily completion of selected habits over a fixed duration.

**States:**
- **No challenge:** Shows explanation + "Start a Challenge" button
- **Active challenge:** Shows day counter (e.g. "Day 7 of 30"), progress, missed days count, punishment reminder
- **Failed:** Shows failure screen with quit reason
- **Completed:** Celebrates with milestone badge

**Challenge params:**
- Title (default "The Forge Crucible")
- Target habits (comma-separated habit IDs)
- Duration: 21 | 30 | 66 | 75 | 100 days
- Intensity: Hard | Extreme | Legendary
- Punishment: free-text (e.g. "Delete all my photos")

---

### Analytics
**Route:** `/analytics`

Performance analytics dashboard. Shown in screenshots photo_4 and photo_7.

**Header:** "PERFORMANCE ANALYTICS" orange label + "Productivity Matrix" title

**3 Stat Cards (grid):**
- HABIT RATE: 0% / Past 7 days
- TASKS DONE: N% / N done
- ACTIONS: N total logged

**Heatmap (SVG, hand-drawn):**
- GitHub-style grid: ~18 weeks × 7 days = ~126 cells
- Each cell: 10×10 rounded rect, grey or orange at 4 opacity levels
- Month labels above (Aug, Sep, Oct, Nov); day labels left (Mon, Wed, Fri)
- Legend: "Less → More" with orange opacity swatches
- Title: "N contributions in the last year"

**Pillar Balance Matrix (SVG radar, hand-drawn):**
- Section label "PILLAR BALANCE MATRIX" (orange)
- Title: "Polymath Equilibrium (N%)" + "CALIBRATING" badge
- 4-axis diamond radar chart: Dev Sprints, Video/Media, Academics, Vitality
- Orange filled polygon + dots at vertices; white/grey diamond grid lines

**Production Domains:**
- Section label "PRODUCTION DOMAINS"
- One card with two rows: Software Dev (orange bar) + Daily Lifestyle Habits (green bar)
- Each row: emoji + label + "N / N completed today" + progress bar

**Streak Freeze Vault:**
- Blue-tinted card (`#0A84FF` accent)
- "STREAK FREEZE VAULT" blue label + "N Shield Available"
- "Freeze Day" button (solid blue)
- Explanation text

**Smart Habit Scheduler** (shown in screenshot photo_3, Analytics tab):
- "SMART HABIT SCHEDULER" label + toggle
- "Pattern-Based Prompts" title
- Suggested times per habit with reasoning
- "Sync Smart Reminders" orange button
- Push Notification Test Lab: Task Alert + Habit Guard buttons

**Milestone Badges** (top of analytics, photo_3):
- Locked badges: Boss Conqueror, Iron Will 66, Century Master (shown as locked cards)

---

### Profile
**Route:** `/profile`

User identity and lifestyle blueprint. Shown in screenshots photo_1 and photo_2.

**Banner:**
- Full-width dark image area (user can set photo; default: abstract dark art)
- Camera button top-right to change banner

**Avatar:**
- Circle 80px, orange 3px ring, overlapping banner bottom
- Camera overlay for change

**Bio section:**
- Username (large bold)
- Headline / handle (orange, smaller)
- Bio paragraph (secondary text)
- "✏ Edit Bio" button (dark pill, top-right of bio area)

**Occupation chips (rounded pills):**
- Up to 3: e.g. "🎓 University Academics", "🔥 Founder / Business", "💻 Computer Science"

**3 Stats cards:**
- HABITS: "N active" (orange)
- TASKS DONE: "N / N" (green)
- STATUS: "High Velocity" (blue) or other status text

**Lifestyle Blueprint:**
- Section label "LIFESTYLE BLUEPRINT" (orange, uppercase)
- List of dark cards, each with orange icon chip + label + value:
  1. Primary Focus Area
  2. Baseline Consistency
  3. Streak Safeguard (friction hurdle)
  4. Prime Time Window
  5. Daily Prompt (briefing time)

---

## 2. Data Models

### habits
| Field | Type | Notes |
|---|---|---|
| id | number (autoIncrement PK) | |
| name | string | Display name |
| category | string | Health, Mind, Productivity, Energy, Routine, Night, Engineering, Sleep, General |
| iconName | string | water, book, meditation, workout, target, sunlight, sleep, meal, code |
| colorHex | string | e.g. `#FF6A00` |
| targetCount | number | default 1 |
| unit | string | times, glasses, session, etc. |
| timeOfDay | string | Morning, Afternoon, Evening, Anytime |
| frequency | string | DAILY, WEEKDAYS, WEEKENDS, CUSTOM |
| customDays | string | comma-sep day numbers (0=Sun…6=Sat), used when frequency=CUSTOM |
| currentStreak | number | updated after each toggle |
| bestStreak | number | historical max |
| lastCompletedDate | string \| null | yyyy-MM-dd local |
| createdAt | number | ms timestamp |
| isArchived | boolean | soft delete |

### habitEntries
| Field | Type | Notes |
|---|---|---|
| id | number (autoIncrement PK) | |
| habitId | number | FK → habits.id |
| date | string | yyyy-MM-dd LOCAL |
| currentCount | number | how many times logged |
| targetCount | number | copy from habit at time of entry |
| isCompleted | boolean | currentCount >= targetCount |
| completedAt | number | ms timestamp |
| notes | string \| null | optional note |

**Unique index:** `[habitId, date]`

### tasks
| Field | Type | Notes |
|---|---|---|
| id | number (autoIncrement PK) | |
| title | string | |
| notes | string \| null | |
| category | string | Software Dev, Video & Photo, University, Client Work, Personal |
| priority | string | Urgent, High, Medium, Low |
| scope | string | Short-Term, Long-Term, Milestone |
| dueDate | string \| null | yyyy-MM-dd |
| endDate | string \| null | |
| dailyTimeline | string \| null | e.g. "10:00 - 12:00 (2h)" |
| estimatedHours | number | |
| clientOrCourse | string \| null | workspace identifier |
| tags | string | comma-separated |
| kanbanStatus | string | TODO, IN_PROGRESS, REVIEW, SHIPPED |
| isCompleted | boolean | |
| completedAt | number \| null | |
| createdAt | number | |

### userProfile (singleton, id=1)
| Field | Type | Onboarding Question |
|---|---|---|
| id | 1 (fixed) | |
| userName | string | |
| headline | string | |
| bio | string | |
| bannerUri | string \| null | base64 or blob URL |
| avatarUri | string \| null | |
| focusArea | string | Q1: Primary focus area |
| currentConsistency | string | Q2: Baseline consistency |
| frictionHurdle | string | Q3: Main friction / hurdle |
| targetHabitLoad | string | Q4: Target habit load |
| primeZone | string | Q5: Prime time window |
| starterHabits | string | Q6: Chosen starter habits (comma-sep) |
| motivationStyle | string | Q7: Motivation style |
| timeCommitment | string | Q8: Daily time commitment |
| briefingTime | string | Q9: Daily briefing time |
| pledgeAccepted | boolean | Q10: Signed the pledge |
| isOnboardingCompleted | boolean | |
| occupations | string | comma-separated |
| workspaces | string | comma-separated |
| streakFreezesAvailable | number | default 1 |
| streakFreezesUsed | number | |
| isComebackProtocolActive | boolean | |
| lastFreezeDate | string \| null | |
| joinedAt | number | |

### bossChallenges
| Field | Type | Notes |
|---|---|---|
| id | number (autoIncrement PK) | |
| title | string | default "The Forge Crucible" |
| targetHabitIds | string | comma-separated habit IDs |
| durationDays | number | 21, 30, 66, 75, or 100 |
| intensity | string | Hard, Extreme, Legendary |
| punishment | string | user-defined consequence for failure |
| startDate | string | yyyy-MM-dd |
| endDate | string | yyyy-MM-dd |
| currentDayNumber | number | 1-indexed current day |
| completedDays | number | days with all target habits done |
| missedDays | number | |
| isActive | boolean | |
| isFailed | boolean | |
| isCompleted | boolean | |
| quitReason | string \| null | |
| createdAt | number | |

### streakFreezes (new, not in Android)
| Field | Type | Notes |
|---|---|---|
| id | number (autoIncrement PK) | |
| date | string | yyyy-MM-dd the freeze protects |
| habitId | number \| null | null = global (all habits) |
| createdAt | number | |

---

## 3. Color Palette

| Token | Hex | Usage |
|---|---|---|
| Black | `#000000` | Page background |
| Obsidian | `#070709` | App chrome background |
| Surface | `#0E0E12` | Surface layer |
| Elevated | `#14141A` | Input fields, bottom nav |
| Card | `#1B1B24` | Habit cards, analytics cards |
| Light | `#242430` | Lightest surface |
| Border | `#22222E` | Default card borders |
| Highlight | `#323242` | Active border highlight |
| Orange | `#FF6A00` | Primary accent, FAB, active state |
| Orange Neon | `#FF7A1A` | Hover/pressed orange |
| Orange Bright | `#FF8C38` | |
| Amber | `#FF9F0A` | Habit colour (reading) |
| Orange Deep | `#E65100` | Bottom of flame gradient |
| Orange Soft | `rgba(255,106,0,0.14)` | Icon chip backgrounds |
| Text Primary | `#F7F7FA` | Main text |
| Text Secondary | `#A0A0AB` | Labels, secondary text |
| Text Tertiary | `#6E6E7A` | Placeholders, metadata |
| Green | `#30D158` | Success, tasks done, Vitality |
| Red | `#FF453A` | Errors |
| Blue | `#0A84FF` | Streak freeze, status |
| Purple | `#BF5AF2` | Meditation habit |
| Gold | `#FFD60A` | Sunlight habit |
| Boss Red | `#FF3B30` | Boss mode accent |
| Boss Crimson | `#FF2D55` | Boss mode danger |

---

## 4. Design System Patterns

### Cards
- Radius: ~28px for large cards, ~20px for habit cards, ~18px for smaller
- Border: 1px `#22222E`
- Background: `#1B1B24`
- No heavy shadow — the border defines the shape

### Chips / Pills
- Habit icon chip: 56×56px, 14px radius, tinted background (colorHex + 22 for bg, 44 for border)
- Category chip: fully rounded pill, `#14141A` bg, `#22222E` border
- Filter chips: fully rounded, flex-1, solid orange when selected

### Bottom Navigation
- Floating dark pill: `bg-elevated border border-border rounded-[36px]`
- Width: 88vw, maxWidth 420px
- Position: fixed bottom, safe-area aware
- 5 slots: Home | Tasks | [Flame button] | Analytics | Profile
- Flame button: 60px circle, red→orange gradient
- Active: icon + label = `#FF6A00`; Inactive: `#6E6E7A`

### Typography
- Font: Roboto
- Section labels: `text-[11px] font-bold tracking-[0.12em] uppercase text-orange`
- Screen titles: `text-[26-28px] font-bold`
- Card titles: `text-xl font-bold`
- Habit name: `text-[15px] font-semibold`
- Body: `text-sm`
- Metadata: `text-xs text-text-secondary`

### FAB
- 56px circle, `bg-orange`, fixed bottom-right
- Position: above the bottom nav (bottom: safe-area + 90px)
- Orange glow shadow

---

## 5. Streak Calculator Logic

**Algorithm (port of Android StreakCalculator.kt, with 3 fixes):**

1. **Frequency awareness**: Non-scheduled days are skipped — they neither increment nor break the streak. DAILY = all days; WEEKDAYS = Mon–Fri; WEEKENDS = Sat+Sun; CUSTOM = specified weekday numbers.

2. **Freeze dates**: A frozen date is treated as "protected" — if a habit has a freeze on that date, the streak is maintained even though the habit wasn't completed.

3. **Today unfinished**: The streak is calculated as of yesterday if today is not completed. The current day never breaks the streak.

**How current streak is calculated:**
- Start from today (count it if completed)
- Walk backwards day by day
- Skip non-scheduled days entirely
- Count completed days; allow freeze days to pass through without penalty
- Stop at first unprotected scheduled non-completion day

**Best streak:**
- Walk through all sorted completed dates
- Track consecutive runs (allowing frozen gaps and non-scheduled gaps)
- Return historical maximum

---

## 6. Onboarding Flow (10 questions)

The Android app has a 10-question onboarding screen. Questions saved to `userProfile`:

| Q | Field | Sample values |
|---|---|---|
| Q1 | focusArea | "Physical Vitality", "Mental Clarity", "Career Growth" |
| Q2 | currentConsistency | "Starting fresh", "Hot and cold", "Fairly consistent" |
| Q3 | frictionHurdle | "Lack of time", "Motivation dips after days", "Distraction" |
| Q4 | targetHabitLoad | "1-2 Focused habits", "3-4 Balanced routine", "5+ Full system" |
| Q5 | primeZone | "Early Morning", "Midday Power", "Evening" |
| Q6 | starterHabits | Multi-select from 8 presets; stored comma-separated |
| Q7 | motivationStyle | "Streak Counter & Heatmaps", "Achievement Badges" |
| Q8 | timeCommitment | "15 - 30 minutes", "30 - 60 minutes" |
| Q9 | briefingTime | Time string e.g. "08:00 AM" |
| Q10 | pledgeAccepted | boolean — sign the commitment pledge |

After Q10, `isOnboardingCompleted = true` and selected habits are seeded.

---

## 7. Preset Habits (for onboarding)

| Name | Category | Icon | Color | Target | Unit | Time |
|---|---|---|---|---|---|---|
| Drink 2L Water | Health | water | `#0A84FF` | 8 | glasses | Anytime |
| Read 15 Pages | Mind | book | `#FF9F0A` | 1 | session | Evening |
| 10 Min Meditation | Mind | meditation | `#BF5AF2` | 1 | session | Morning |
| 30 Min Exercise / Walk | Health | workout | `#FF6A00` | 1 | workout | Morning |
| Plan Top 3 Priorities | Productivity | target | `#30D158` | 1 | session | Morning |
| No Screens 30m Before Bed | Sleep | sleep | `#64D2FF` | 1 | night | Evening |
| Healthy Home Meal | Health | meal | `#30D158` | 1 | meal | Afternoon |
| 5 Min Morning Sunlight | Routine | sunlight | `#FFD60A` | 1 | viewing | Morning |

---

## 8. Task View Modes

### BENTO (default)
- Timeline strip (horizontal day scroll)
- Priority Matrix (2-column bento: white=Low, orange=Medium)
- Daily Task ring card
- "Today's Task" flat list sorted by priority then completion

### EISENHOWER
- 4-quadrant matrix: Urgent/Not Important, Urgent/Important, Not Urgent/Not Important, Not Urgent/Important
- Each quadrant is a scrollable column

### KANBAN
- 4 horizontal columns: TODO, IN_PROGRESS, REVIEW, SHIPPED
- Cards draggable between columns
- Each column has a header with count badge

---

## 9. Decisions Made in Phase 0

1. Added `customDays` field to `habits` (not in Android model) — required for CUSTOM frequency streak calculation.
2. Added `streakFreezes` table (not in Android) — was planned but never implemented in the Android version.
3. Stats screen `parseLocalDate` exported from `streak.ts` — needed by stats module.
4. Boss Mode screen is accessible from center flame nav button (matches screenshots).
5. Bottom nav pill is 88vw wide, not full-width — matches screenshot proportions.

