

# Filter Feature Implementation Plan

## Overview
Build a comprehensive filter system for the Scores page that allows users to create, save, and apply filters to their song score data. The feature includes:
1. A "Choose Filter" half-sheet modal showing saved filters
2. A "Create Filter" half-sheet modal for building new filters with multiple rules
3. Smooth animations using the existing Drawer (vaul) component
4. Real-time result counting with a dynamic "Show X Results" button

---

## User Flow

```text
Tap "Add Filter..."
       |
       v
+---------------------+
| Choose Filter Modal | (only if saved filters exist)
| - List of saved     |
| - Multi-select      |
+---------------------+
       |
   No saved filters? ----> Skip directly to Create Filter
       |
       v
+----------------------+
| Create Filter Modal  |
| - Name input         |
| - Rule builder       |
| - Match mode toggle  |
| - Show X Results btn |
+----------------------+
```

---

## What Will Be Built

### 1. Database Table for Saved Filters
A new `user_filters` table will store user-created filters with:
- Filter name
- Array of filter rules (stored as JSON)
- Match mode setting ("all" or "any")
- User ownership for data isolation

### 2. New Components

| Component | Purpose |
|-----------|---------|
| `FilterModal` | Main orchestrator that manages which sheet to show |
| `ChooseFilterSheet` | Displays saved filters with multi-select capability |
| `CreateFilterSheet` | Filter builder UI with rule management |
| `FilterRuleRow` | Individual rule with type/operator/value inputs |
| `MatchModeToggle` | "Match all" / "Match any" toggle |

### 3. Filter Types & Their Options

| Filter Type | Available Operators | Value Selection |
|-------------|---------------------|-----------------|
| **Score** | Is, Is not, Less than, Greater than, Is between | Number input (0-1,000,000) |
| **Level** | Is, Is not, Less than, Greater than, Is between | Number input (1-19) |
| **Grade** | Is, Is not | Dropdown: AAA, AA+, AA, AA-, A+, A, B, C, D, E |
| **Lamp** | Is, Is not | Dropdown: MFC, PFC, GFC, FC, LIFE4, Clear, Fail |
| **Difficulty** | Is, Is not | Dropdown: BEGINNER, BASIC, DIFFICULT, EXPERT, CHALLENGE |
| **Title** | Is, Is not, Contains | Text input |
| **Flare** | Is, Is not, Less than, Greater than, Is between | Visual selector using FlareChip graphics (EX, I-IX) |
| **Version** | Is, Is not | Dropdown (values from database) |
| **Era** | Is, Is not | Dropdown (values from database) |

### 4. Operator Logic by Type

Different filter types will show only relevant operators:

| Type | Numeric Comparison | Equality | Text Match |
|------|-------------------|----------|------------|
| Score, Level, Flare | Less than, Greater than, Is between | Is, Is not | - |
| Grade, Lamp, Difficulty, Version, Era | - | Is, Is not | - |
| Title | - | Is, Is not | Contains |

### 5. Multi-Rule Behavior

When a user adds a second rule:
- A toggle appears: "Match all rules" vs "Match any rule"
- **ALL**: Results must match every rule (AND logic)
- **ANY**: Results match if at least one rule applies (OR logic)

---

## Visual Design Specifications

### Half-Sheet Styling
Based on the provided mockups:
- Background: #262937 (dark)
- Card backgrounds: #3B3F51
- Border radius: 10px
- Drag handle: 100px wide, centered, muted color
- Padding: 28px horizontal (matches app layout grid)

### Flare Value Selector
Instead of text dropdowns, the Flare filter will display a horizontal scrollable row of FlareChip graphics (the existing PNG badges) that users can tap to select. This provides a visual, game-authentic selection experience.

### Lamp Value Selector  
Options will include the HaloChip graphics for: MFC, PFC, GFC, FC, LIFE4, plus text options for Clear and Fail.

### Animation Strategy
Using the vaul Drawer component which provides:
- Native spring-based animations
- Touch-to-drag dismissal
- Smooth backdrop fade
- No janky or jarring transitions

Additional polish:
- Rule rows fade/slide in when added
- Match mode toggle fades in when 2+ rules exist
- Result count animates when value changes

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
1. ✅ Create database table `user_filters` with security policies
2. ✅ Create TypeScript types for filter rules and saved filters
3. ✅ Create base `FilterModal` component with drawer structure

### Phase 2: Create Filter UI ✅ COMPLETE
4. ✅ Build `FilterRuleRow` with dynamic type/operator/value inputs
5. ✅ Build `CreateFilterSheet` with rule management
6. ✅ Build `MatchModeToggle` component
7. ✅ Add FlareChip-based visual selector for Flare values
8. ✅ Create hook for live result counting

### Phase 3: Choose Filter UI ✅ COMPLETE
9. ✅ Build `ChooseFilterSheet` with saved filter list
10. ✅ Implement multi-select and apply logic

### Phase 4: Integration ✅ COMPLETE
11. ✅ Connect `FiltersSection` to open the FilterModal
12. ✅ Apply active filters to the Scores page results
13. ✅ Add auto-name generation for filters saved without a name

### Phase 5: Polish
14. Fine-tune animations and transitions
15. Add loading states and error handling
16. Handle empty states and edge cases

---

## Auto-Name Generation

When a user saves a filter without providing a name:
- **Single rule**: "{Type} {Operator} {Value}" (e.g., "Level Is 15", "Flare Is EX")
- **Multiple rules**: "{First Rule Summary} + {count-1} more" (e.g., "Level Is 15 + 2 more")

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/filters/FilterModal.tsx` | Main modal orchestrator |
| `src/components/filters/ChooseFilterSheet.tsx` | Saved filters list |
| `src/components/filters/CreateFilterSheet.tsx` | Filter builder |
| `src/components/filters/FilterRuleRow.tsx` | Individual rule component |
| `src/components/filters/MatchModeToggle.tsx` | All/Any toggle |
| `src/components/filters/FlareSelector.tsx` | Visual Flare picker using FlareChip |
| `src/components/filters/LampSelector.tsx` | Visual Lamp picker with HaloChip |
| `src/components/filters/filterTypes.ts` | TypeScript types and constants |
| `src/hooks/useFilterResults.ts` | Hook for live result counting |
| `src/hooks/useSavedFilters.ts` | Hook for CRUD operations on saved filters |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/scores/FiltersSection.tsx` | Update Filter interface, connect to FilterModal |
| `src/pages/Scores.tsx` | Apply active filters to displayedScores, manage filter state |

---

## Technical Details

### Filter Rule Type Definition
```typescript
type FilterType = 'score' | 'level' | 'grade' | 'lamp' | 'difficulty' | 'title' | 'flare' | 'version' | 'era';
type FilterOperator = 'is' | 'is_not' | 'less_than' | 'greater_than' | 'is_between' | 'contains';

interface FilterRule {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string | number | [number, number]; // tuple for "is_between"
}

interface SavedFilter {
  id: string;
  name: string;
  rules: FilterRule[];
  matchMode: 'all' | 'any';
}
```

### Database Migration
```sql
CREATE TABLE public.user_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]',
  match_mode TEXT NOT NULL DEFAULT 'all' 
    CHECK (match_mode IN ('all', 'any')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_filters ENABLE ROW LEVEL SECURITY;

-- Users can only access their own filters
CREATE POLICY "Users can view own filters"
  ON public.user_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own filters"
  ON public.user_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filters"
  ON public.user_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own filters"
  ON public.user_filters FOR DELETE
  USING (auth.uid() = user_id);
```

### Lamp Options (including LIFE4)
```typescript
const LAMP_OPTIONS = [
  { value: 'mfc', label: 'MFC', hasChip: true },
  { value: 'pfc', label: 'PFC', hasChip: true },
  { value: 'gfc', label: 'GFC', hasChip: true },
  { value: 'fc', label: 'FC', hasChip: true },
  { value: 'life4', label: 'LIFE4', hasChip: true },
  { value: 'clear', label: 'Clear', hasChip: false },
  { value: 'fail', label: 'Fail', hasChip: false },
];
```

### Flare Options (using FlareChip graphics)
```typescript
const FLARE_OPTIONS = [
  { value: 'ex', type: 'ex' as FlareType },
  { value: 'ix', type: 'ix' as FlareType },
  { value: 'viii', type: 'viii' as FlareType },
  { value: 'vii', type: 'vii' as FlareType },
  { value: 'vi', type: 'vi' as FlareType },
  { value: 'v', type: 'v' as FlareType },
  { value: 'iv', type: 'iv' as FlareType },
  { value: 'iii', type: 'iii' as FlareType },
  { value: 'ii', type: 'ii' as FlareType },
  { value: 'i', type: 'i' as FlareType },
];
```

