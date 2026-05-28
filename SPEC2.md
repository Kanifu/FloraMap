# FloraMap SPEC v2.0

**Replaces:** PRODUCT_DESIGN.md (stale), README feature list (stale)
**Ground truth as of:** 28 mei 2026 · v1.7.0 · build #6.1
**Status:** Ready to implement

---

## 1. What FloraMap is

A care companion for vegetable gardeners. The garden map is your home screen — it shows your plants and tells you what needs attention at a glance. Everything else (history, planning, AI, seeds) is one tap away in the drawer.

**Core daily loop:**
Open app → see garden → understand what needs doing → mark done → close app.

**Target user:** Hobby moestuin gardener, NL primary / EN secondary.
**Model:** Free download, no accounts, no cloud sync, local storage only (v1).

---

## 2. What exists in v1.7 (confirmed from code + screenshots)

### Navigation

- Hamburger drawer (☰ button, top-right of MapScreen)
- Drawer sections: WEERGAVE (companion toggle, plant names toggle) · ACTIES (scan, zaadkast) · GA NAAR (assistent, plannen & onderhoud, over) · OVERIG (bug melden)
- MapScreen is always the base — drawer slides over it

### MapScreen

- Dark soil background, 25×25 grid, 1 cel = 30×30 cm
- Dashed-orange borders on plant zones, emoji tile fill
- Single plants: large emoji + name label
- Long-press → PlantMenu (verplaatsen, uitrekken, kleur, notitie, verwijderen)
- Tap plant → PlantQuickSheet (tasks + care tips + plantenpaspoort button)
- FAB (⊕ / ✕) → speed-dial: Ga naar assistent / Plant/zone toevoegen / Grens toevoegen / Zaadkast
- Weather + task status pills below the hint bar
- Companion overlay toggle (drawer)
- Plant names toggle (drawer)
- Camera scan → Gemini → CorrectionSheet → place on map
- 2-click zone drawing (drawStep: first → second corner)

### PlantQuickSheet

- Slides up from tap on any plant/zone
- Plant name + species · "Naam corrigeren" link
- Task rows: icon + label + interval + due date + ✓ complete button
- Care tips (max 2 visible)
- "Volledig plantenpaspoort →" button → PlantCardScreen

### PlantCardScreen

- Gescand/handmatig badge · datum · zekerheidspercentage
- Notitie sectie
- Verzorgingstips
- Openstaande taken + ✓ Klaar button per taak
- **Groeifasen** — "+ Foto" button, photo log
- **Oogstdagboek** — "Oogst registreren" button

### Plannen & Onderhoud (drawer → "Plannen & onderhoud")

- 3 internal tabs: Taken | Planning | Geschiedenis
- Taken tab: SectionList (Vandaag & achterstallig / Deze week / Later), swipeable rows
- Planning tab: 30-day calendar grouped by date, weather emoji per day
- Geschiedenis tab: completed tasks grouped by month with timestamp
- Weather card (Open-Meteo, 7-day), seasonal tip of the month, harvest alerts
- ICS calendar export (📅 button in header)

### Other screens

- AssistantScreen: Gemini chat, image upload, structured PLANTS/TASKS parsing
- AboutScreen: version info, backup export/import (JSON)
- Zaadkast: seed management (code not yet reviewed)

### Data model (key facts)

- `Garden.plants: Plant[]` — zones are Plants with `width > 1 || height > 1`
- `Plant.maintenanceTasks: MaintenanceTask[]` — embedded, with `intervalDays` for recurrence
- `Plant.photoLog?: PhotoLogEntry[]` — already in schema
- `Plant.harvestMonths?: number[]` — 0-indexed months
- `completeMaintenanceTask(plantId, taskId)` — auto-creates next recurrence in store
- Zustand + AsyncStorage, single JSON blob persisted

---

## 3. Three changes to make (the spec)

### Change 1 — Make the task pill tappable → TodaySheet

**Problem:** The `⏰ 2 binnenkort` pill is display-only. Seeing the count but not the tasks forces a full navigation to "Plannen & onderhoud."

**Target UX:** Tap pill → bottom sheet slides up → today's tasks listed → tap ✓ → task gone → sheet updates. No screen switch. Stay on your garden.

---

#### 3.1a New component: `src/components/TodaySheet/index.tsx`

Props:

```ts
interface Props {
  visible: boolean;
  onClose: () => void;
  garden: Garden | null;
  weatherRainExpected: boolean;
  onOpenPlant: (plantId: string) => void;        // opens PlantQuickSheet
  onOpenMaintenance: () => void;                  // navigates to Plannen & onderhoud
}
```

Behavior:

- Aggregates all tasks where `!completedDate && dueDate <= today` across all plants
- Sorted: overdue first, then by dueDate ascending
- Groups: "Vandaag & achterstallig" (same logic as MaintenanceScreen sections[0])
- Renders task rows: same visual language as PlantQuickSheet rows
  - Task icon · plant name (bold) · task type · due label · green ✓ button
  - Overdue row: red border, red text
  - Water task when rain expected: muted style + 🌧️ hint
- Tapping ✓ calls `completeMaintenanceTask(plant.id, task.id)` from store
- Tapping plant name calls `onOpenPlant(plant.id)`
- Footer: "Bekijk alle taken →" → calls `onOpenMaintenance()`
- Empty state: "🌿 Niets te doen — geniet van je tuin!"

Visual structure (copy from PlantQuickSheet):

- White card, borderTopRadius 20, maxHeight '75%'
- Drag handle top-center
- ScrollView for task list
- No weather card (already visible on map behind the sheet)

---

#### 3.1b Changes in `src/screens/MapScreen/index.tsx`

Add state:

```ts
const [showTodaySheet, setShowTodaySheet] = useState(false);
```

The pill currently renders as a non-interactive View. Find it (renders `pendingTaskCount` or similar) and wrap:

```tsx
// BEFORE
<View style={styles.badge}>
  <Text style={styles.badgeText}>{pendingTaskCount} binnenkort</Text>
</View>

// AFTER
<TouchableOpacity
  style={styles.badge}
  onPress={() => setShowTodaySheet(true)}
  activeOpacity={0.8}>
  <Text style={styles.badgeText}>{pendingTaskCount} binnenkort</Text>
</TouchableOpacity>
```

Add TodaySheet at the bottom of the JSX (alongside PlantMenu, CorrectionSheet, etc.):

```tsx
<TodaySheet
  visible={showTodaySheet}
  onClose={() => setShowTodaySheet(false)}
  garden={garden}
  weatherRainExpected={false} // wire to weather state if available in MapScreen
  onOpenPlant={(plantId) => {
    setShowTodaySheet(false);
    const plant = garden?.plants.find(p => p.id === plantId);
    if (plant) setSelectedPlant(plant);
  }}
  onNavigateToMaintenance={() => {
    setShowTodaySheet(false);
    // navigate to Maintenance via drawer or navigation.navigate
  }}
/>
```

**Note:** Check the exact state variable that triggers PlantQuickSheet. From code review it appeared to be a `selectedPlant` state + Modal. Use that same mechanism.

---

### Change 2 — Per-plant status badges on the map

**Problem:** Only thirsty (water-overdue) plants get a visual indicator. Fertilize-due, harvest-ready plants look identical to healthy ones. The "pride view" only works if healthy plants look genuinely clean.

**Target UX:** Each plant/zone gets a small colored badge (or nothing if all is well). Glancing at your garden, you see exactly which plants need what.

---

#### Badge priority (only show the highest)

| Priority | Condition | Badge | Color |
| :---- | :---- | :---- | :---- |
| 1 | ≥2 task types overdue | Red circle with count | `#e63946` |
| 2 | Only water overdue | 💧 circle | `#3a86ff` |
| 3 | Only fertilize overdue | 🌱 circle | `#2d6a4f` |
| 4 | Only prune overdue | ✂️ circle | `#6b705c` |
| 5 | Harvest month, no overdue | 🍓 circle | `#ffb703` |
| — | Nothing overdue | Nothing | (clean map) |

---

#### 3.2a New useMemo in MapScreen

Add after the existing `thirstyPlantIds` memo:

```ts
interface PlantStatus {
  needsWater: boolean;
  needsFertilize: boolean;
  needsPrune: boolean;
  harvestReady: boolean;
  overdueCount: number;
}

const plantStatusMap = useMemo((): Map<string, PlantStatus> => {
  if (!garden) return new Map();

  const now = new Date().toISOString();
  const currentMonth = new Date().getMonth();

  return new Map(
    garden.plants.map((plant) => {
      const overdue = plant.maintenanceTasks.filter(
        (t) => !t.completedDate && t.dueDate < now,
      );

      return [
        plant.id,
        {
          needsWater:     overdue.some((t) => t.type === 'water'),
          needsFertilize: overdue.some((t) => t.type === 'fertilize'),
          needsPrune:     overdue.some((t) => t.type === 'prune'),
          harvestReady:   (plant.harvestMonths ?? []).includes(currentMonth),
          overdueCount:   overdue.length,
        },
      ];
    }),
  );
}, [garden]);
```

Pass to GardenMap:

```tsx
<GardenMap
  ...
  plantStatusMap={plantStatusMap}
/>
```

---

#### 3.2b Changes in `src/components/GardenMap/index.tsx`

Add to props interface:

```ts
plantStatusMap?: Map<string, PlantStatus>;
```

Add a helper to resolve badge for a plant:

```ts
const getBadge = (plantId: string): { emoji: string; color: string } | null => {
  const s = plantStatusMap?.get(plantId);
  if (!s) return null;

  if (s.overdueCount >= 2)    return { emoji: `${s.overdueCount}`, color: '#e63946' };
  if (s.needsWater)           return { emoji: '💧', color: '#3a86ff' };
  if (s.needsFertilize)       return { emoji: '🌱', color: '#2d6a4f' };
  if (s.needsPrune)           return { emoji: '✂', color: '#6b705c' };
  if (s.harvestReady)         return { emoji: '🍓', color: '#ffb703' };

  return null;
};
```

For **single plants** — add after the emoji SvgText element:

```tsx
{(() => {
  const badge = getBadge(plant.id);
  if (!badge) return null;

  const bx = cx + 14;
  const by = cy - 14;

  return (
    <G key={`badge-${plant.id}`}>
      <Circle cx={bx} cy={by} r={9} fill={badge.color} />
      <SvgText x={bx} y={by + 4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">
        {badge.emoji}
      </SvgText>
    </G>
  );
})()}
```

For **zones** — add inside the zone G, after the label pill:

```tsx
{(() => {
  const badge = getBadge(plant.id);
  if (!badge) return null;

  const bx = zLeft + zW - 10;
  const by = zTop + 10;

  return (
    <G key={`badge-${plant.id}`}>
      <Circle cx={bx} cy={by} r={11} fill={badge.color} />
      <SvgText x={bx} y={by + 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="700">
        {badge.emoji}
      </SvgText>
    </G>
  );
})()}
```

**Keep `thirstyPlantIds` prop** for backward compatibility — it's still used for the blue dashed ring on single plants, which is a separate visual from the badge (ring = decoration, badge = action indicator). They can coexist.

---

### Change 3 — Hint bar: only show during interactive mode

**Problem:** "1 cel = 30×30 cm · lang indrukken om te bewerken · + voor nieuwe zone" is always visible. Takes ~30px of prime map real estate to show instructions the user doesn't need during normal viewing.

**Rule:** Show hint bar only when `isInteractive === true` (i.e., user is actively placing a plant, moving a plant, or drawing a zone).

`isInteractive` is already computed in MapScreen:

```ts
const isInteractive = !!movingPlant || !!drawStep || plantsToPlace.length > 0;
```

In the JSX, find the hint bar render. Currently it shows when `!bannerInfo`. Change to:

```tsx
// BEFORE
{bannerInfo ? (
  <View style={styles.banner}>...</View>
) : (
  <View style={styles.hintBar}>
    <Text style={styles.hintText}>1 cel = 30×30 cm ...</Text>
  </View>
)}

// AFTER
{bannerInfo ? (
  <View style={styles.banner}>...</View>
) : isInteractive ? (
  <View style={styles.hintBar}>
    <Text style={styles.hintText}>1 cel = 30×30 cm ...</Text>
  </View>
) : null}
```

That's it. Three lines. ~30px of map recovered for every normal session.

---

## 4. Code cleanup (do alongside)

These are safe changes. None breaks any feature.

### Delete these files

- `src/modules/diff/MaintenanceNotifications.ts` — dead stub (real one is NotificationService.ts)
- `src/modules/diff/SmartScan.ts` — imports non-existent ARService
- `src/modules/diff/DiffDetection.ts` — only used by SmartScan

If you want to keep them for future AR work: move to `src/future/` and remove from any index.ts exports.

### Clean up models/index.ts

`PlantZone` interface and `Garden.zones?: PlantZone[]` are unused. GardenMap never renders `garden.zones`. Plants with `width > 1 || height > 1` already handle zones. Options:

- **Cleanest:** Delete `PlantZone`, delete `Garden.zones?`, add a comment: `// Zones are represented as Plants with width/height > 1`
- **Safe:** Keep but add `// @deprecated — use Plant with width/height > 1 instead`

### Add theme.ts

Create `src/theme.ts`:

```ts
export const colors = {
  primary:       '#2d6a4f',
  primaryDark:   '#1b4332',
  primaryLight:  '#52b788',
  surface:       '#d8f3dc',
  surfaceLight:  '#f1f8f3',
  border:        '#b7e4c7',
  textPrimary:   '#1b4332',
  textSecondary: '#6b705c',
  textMuted:     '#aaa',
  danger:        '#e63946',
  warning:       '#ffb703',
  infoBlue:      '#3a86ff',
  soil:          '#1a0f00',
} as const;
```

Use in new code going forward. Don't do a full replace in one pass — just ensure no new hardcoded hex values.

### PlantIcon component check

`src/components/PlantIcon/index.tsx` renders a plant emoji circle with an overdue badge. Check if anything imports it. If only PlantCardScreen: fine, keep. If nothing imports it: delete. GardenMap has its own inline rendering.

---

## 5. Implementation order

Each step is independently shippable. Ship after each one.

### Avond 1 (15–30 min total)

1. **Hint bar** — Change `hintBar` render condition to `isInteractive ? <hintBar> : null`. Test: add a plant, see hint. Normal view: no hint.

### Avond 2 (2–3 uur)

2. **Tappable pill** — Add `showTodaySheet` state, wrap pill in `TouchableOpacity`.
3. **TodaySheet component** — Build `src/components/TodaySheet/index.tsx`. Start with the layout (hard-code 2 fake tasks). Wire to real store data. Wire ✓ complete action. Wire "alle taken" link.

### Weekend 1 (4–6 uur)

4. **plantStatusMap useMemo** — Add to MapScreen. Console.log to verify it produces correct statuses.
5. **Badge rendering in GardenMap** — Add `getBadge()` helper. Render badge for single plants first, test. Then add for zones.

### Weekend 2 (2–3 uur)

6. **Dead code cleanup** — Delete 3 files, clean PlantZone, add theme.ts.
7. **Update CLAUDE.md** — Bump buildLabel, update structure section to reflect new TodaySheet component.
8. **Update this spec** — Mark completed items, add any new findings.

---

## 6. Decisions — don't revisit

| Decision | Rationale |
| :---- | :---- |
| Grid stays 25×25 | ScrollView pan works fine. Dense gardens pan to their plants. |
| Drawer navigation stays | Better than bottom tabs. Don't revert. |
| MaintenanceScreen ("Plannen & onderhoud") stays intact | It's the detail view — rich, well-built, worth keeping. |
| No accounts, no cloud sync | Too complex for v1. Local AsyncStorage is fine. |
| No freemium gating | Validate users exist first. Add later. |
| No dark mode | Deferred. Too much design work for current phase. |
| Zaadkast stays where it is | Already in drawer + FAB. Good placement. |

---

## 7. True backlog (no code exists, don't build until users ask)

These appeared in TESTPLAN.md but are **not implemented** in any source file reviewed:

- Gamification: streaks, badges, "3 op rij" mechanic
- Statistieken tab: harvest ranking, task charts
- Zaaikalender: seasonal sowing date recommendations
- Multi-garden support
- Cloud backup / cross-device sync
- Dark mode

**Also not implemented:**

- English translation (i18next setup + string extraction) — needed before Play Store international submission
- PostHog or Plausible analytics — needed before you can measure anything

---

## 8. Known bugs / risks to watch

| Item | Risk | Notes |
| :---- | :---- | :---- |
| `NotificationService.ts` trigger format | Medium | `{ hour, minute, repeats }` is legacy Expo SDK format. On SDK 52 may need `{ type: 'daily', hour, minute }`. Test on device. |
| History grows forever | Low now | `plant.maintenanceTasks` accumulates all completed tasks. With many plants over years this gets big. Not a problem at hobby scale. Add cleanup in v2. |
| `completeMaintenanceTask` ID generation | Low | Uses `Date.now() + Math.random()` — fine for single user, fine for v1. |
| `AsyncStorage` single blob | Low now | Entire garden serialized on every mutation. Fast at <50 plants. Watch performance at 100+ plants. |

---

*This document is the single source of truth for FloraMap v2.0. Keep it in sync with the codebase. Update CLAUDE.md buildLabel on every commit to main.*
