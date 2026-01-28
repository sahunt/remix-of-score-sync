

# 12MS Mode: System-Wide Transformation Plan

## Overview
Extend the 12MS mode toggle to transform halo representations across the entire application, including goal progress calculations. When 12MS mode is ON, the transformation affects both visual display AND goal matching logic.

## Transformation Rules

| Database Value | 12MS Display | Reverse (for goals) |
|---------------|--------------|---------------------|
| PFC | MFC | pfc target matches actual pfc/mfc |
| FC | GFC | fc target matches actual fc/gfc/pfc/mfc |
| GFC | PFC | gfc target matches actual gfc/pfc/mfc |
| MFC | MFC | mfc target matches actual pfc/mfc |
| LIFE4 | LIFE4 | unchanged |
| Clear | Clear | unchanged |
| Fail | Fail | unchanged |

## Implementation Steps

### 1. Enhance 12MS Mode Hook
**File: `src/hooks/use12MSMode.tsx`**

Add new utility functions to the context:
```typescript
// For text labels (uppercase)
transformHaloLabel: (label: string | null) => string | null

// Reverse transformation for goal matching
// Returns what actual DB value would display as the target
reverseTransformHalo: (target: string | null) => string | null
```

**Reverse transformation logic:**
- When goal target is "pfc" and 12MS mode is ON:
- User expects scores that DISPLAY as PFC
- Those are actual GFC scores in the database
- So check if actual halo >= "gfc"

### 2. Update Goal Progress Calculation
**File: `src/hooks/useGoalProgress.ts`**

The `meetsTarget` function needs to accept a transformation function and apply it when checking lamp targets:
- Pass `reverseTransformHalo` from 12MS context
- When checking lamp target, reverse-transform the target value first
- Then check if score meets that transformed target

Since hooks cannot call other hooks directly in utility functions, we'll modify the `useGoalProgress` hook to accept an optional transformation function parameter.

### 3. Update Visual Components

#### StatsSummary + Scores.tsx
**File: `src/pages/Scores.tsx`**
- Use `transformHaloLabel` to transform stat column labels
- "MFC" stays "MFC", "PFC" becomes "MFC" in display

#### LampSelector
**File: `src/components/filters/LampSelector.tsx`**
- Transform displayed lamp option labels using hook
- Actual filter values remain unchanged (filters work on DB values)

#### TargetSelector
**File: `src/components/goals/TargetSelector.tsx`**
- Transform lamp option labels in goal creation UI
- Selected value remains the "visual" target (will be reverse-transformed at evaluation time)

#### HaloChip
**File: `src/components/ui/HaloChip.tsx`**
- Accept transformed type prop OR transform internally
- When rendering "pfc" badge in 12MS mode, show "mfc" asset

#### HaloSparkle
**File: `src/components/ui/HaloSparkle.tsx`**
- Same transformation as HaloChip for sparkle colors

#### GoalBadge
**File: `src/components/home/GoalBadge.tsx`**
- Uses HaloChip, will inherit transformation

#### GoalCard
**File: `src/components/home/GoalCard.tsx`**
- Transform badge type prop

### 4. Update Goal Detail and Home Page
**Files: `src/pages/GoalDetail.tsx`, `src/pages/Home.tsx`**
- Pass transformation context to goal progress calculations

## File Summary

| File | Changes |
|------|---------|
| `src/hooks/use12MSMode.tsx` | Add `transformHaloLabel`, `reverseTransformHalo` |
| `src/hooks/useGoalProgress.ts` | Accept transform function, apply to lamp targets |
| `src/pages/Scores.tsx` | Transform stat labels |
| `src/components/scores/SongCard.tsx` | Verify transformation works (already started) |
| `src/components/filters/LampSelector.tsx` | Transform option labels |
| `src/components/goals/TargetSelector.tsx` | Transform lamp option labels |
| `src/components/ui/HaloChip.tsx` | Transform type prop |
| `src/components/ui/HaloSparkle.tsx` | Transform type prop |
| `src/components/home/GoalBadge.tsx` | Inherit from HaloChip |
| `src/components/home/GoalCard.tsx` | Transform badge type |
| `src/pages/GoalDetail.tsx` | Pass transform to useGoalProgress |
| `src/pages/Home.tsx` | Pass transform to goal progress |

## Technical Details

### Hook Context Addition
```typescript
interface TwelveMSModeContextType {
  is12MSMode: boolean;
  toggle12MSMode: () => void;
  transformHalo: (halo: string | null) => string | null;
  transformHaloLabel: (label: string | null) => string | null;
  reverseTransformHalo: (target: string | null) => string | null;
  loading: boolean;
}
```

### Goal Matching Flow (12MS ON, target="pfc")
1. User sets goal for "PFC all 14s"
2. Goal stored with target_value = "pfc"
3. When calculating progress:
   - `reverseTransformHalo("pfc")` returns `"gfc"`
   - Check if each score's actual halo >= "gfc"
   - GFC, PFC, MFC scores all count toward goal
4. Display shows "PFC" goal with correct progress count

### Filter Behavior
Filters will continue to operate on database values, but the UI labels will be transformed. This means:
- User selects "PFC" filter (displays as "MFC" label in 12MS mode)
- Filter actually filters for actual PFC records in DB
- This maintains consistency: filter for what you SEE

## Edge Cases
- New users without 12MS preference: defaults to false
- Scores with null halos: treated consistently (no transform applied)
- MFC target in 12MS mode: matches actual PFC (since PFC displays as MFC)

