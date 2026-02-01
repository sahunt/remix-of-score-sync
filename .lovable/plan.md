
# Fix Era Filtering: Data Flow and UI Implementation

## Problem Summary

Two issues with era:
1. **Era values not displaying reliably** - The `ScoreWithSong.musicdb` interface doesn't include `era`, so TypeScript/data passing is inconsistent
2. **Era filter has no UI** - The filter rule row shows a text input instead of visual chip selectors for Classic/White/Gold

## Root Cause Analysis

### Issue 1: Era Not in Interface

The `ScoreWithSong` interface defines `musicdb` without the `era` field:

```typescript
// Current (lines 28-39 of Scores.tsx)
musicdb: {
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
  name_romanized: string | null;
  deleted?: boolean | null;
  // MISSING: era: number | null;
} | null;
```

This means TypeScript doesn't type-check era references, and the data can get lost in transformations.

### Issue 2: Era Filter Returns True (Placeholder)

In `matchesRule` function (lines 195-197 of Scores.tsx):
```typescript
case 'era':
  return true; // Placeholder - never actually filters!
```

### Issue 3: Era UI is Text Input

In `FilterRuleRow.tsx` (lines 327-337), era uses a generic text input:
```typescript
case 'version':
case 'era':
  return (
    <input type="text" ... />  // Should be chip selector!
  );
```

## Implementation Plan

### Step 1: Add Era to ScoreWithSong Interface
**File**: `src/pages/Scores.tsx`

Update the `musicdb` subobject to include era:
```typescript
musicdb: {
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
  name_romanized: string | null;
  era: number | null;        // ADD THIS
  deleted?: boolean | null;
} | null;
```

### Step 2: Add ERA_OPTIONS to filterTypes.ts
**File**: `src/components/filters/filterTypes.ts`

Add era options with visual mapping to match the EraChip component:
```typescript
// Era options with visual chip support
import type { EraType } from '@/components/ui/EraChip';

export const ERA_OPTIONS: { value: number; label: string; eraType: EraType }[] = [
  { value: 0, label: 'Classic', eraType: 'classic' },
  { value: 1, label: 'White', eraType: 'white' },
  { value: 2, label: 'Gold', eraType: 'gold' },
];
```

Also update `getDefaultValue` for era to return an empty array (multi-select):
```typescript
case 'era':
  return []; // Empty multi-select array (not string)
```

### Step 3: Create EraSelector Component
**File**: `src/components/filters/EraSelector.tsx` (NEW FILE)

Create a visual selector component similar to DifficultySelector:
```typescript
import { cn } from '@/lib/utils';
import { ERA_OPTIONS } from './filterTypes';
import { EraChip } from '@/components/ui/EraChip';

interface EraSelectorProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export function EraSelector({ value, onChange }: EraSelectorProps) {
  const selectedEras = Array.isArray(value) ? value : [];

  const toggleEra = (era: number) => {
    if (selectedEras.includes(era)) {
      onChange(selectedEras.filter(e => e !== era));
    } else {
      onChange([...selectedEras, era]);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {ERA_OPTIONS.map((option) => {
        const isSelected = selectedEras.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleEra(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-[10px] transition-all",
              isSelected
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-[#3B3F51] hover:bg-[#454a5e]"
            )}
          >
            <EraChip era={option.value} className="h-6" />
            <span className="text-xs text-muted-foreground">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Step 4: Update FilterRuleRow to Use EraSelector
**File**: `src/components/filters/FilterRuleRow.tsx`

Import EraSelector and update the renderValueInput switch statement:
```typescript
import { EraSelector } from './EraSelector';

// In renderValueInput(), replace the era case:
case 'era': {
  let eraValue: number[];
  if (Array.isArray(rule.value)) {
    eraValue = rule.value.filter((v): v is number => typeof v === 'number');
  } else if (typeof rule.value === 'number') {
    eraValue = [rule.value];
  } else {
    eraValue = [];
  }
  
  return (
    <EraSelector
      value={eraValue}
      onChange={handleValueChange}
    />
  );
}
```

### Step 5: Implement Era Filter Logic in matchesRule
**File**: `src/pages/Scores.tsx`

Update the matchesRule function to actually filter by era:
```typescript
case 'era': {
  const songEra = score.musicdb?.era;
  // Multi-select array comparison (similar to lamp/grade but numeric)
  if (Array.isArray(value)) {
    if (value.length === 0) return true; // Empty = no filter
    if (songEra === null || songEra === undefined) return false;
    const matches = value.includes(songEra);
    return operator === 'is' ? matches : !matches;
  }
  // Single value
  if (songEra === null || songEra === undefined) return false;
  const singleValue = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(singleValue)) return true; // Invalid value = no filter
  switch (operator) {
    case 'is': return songEra === singleValue;
    case 'is_not': return songEra !== singleValue;
    default: return true;
  }
}
```

### Step 6: Update useFilterResults.ts matchesRule
**File**: `src/hooks/useFilterResults.ts`

Update the ScoreData interface to include era and implement the era filter logic (same as Step 5):
```typescript
interface ScoreData {
  // ... existing fields
  musicdb: { 
    name: string | null; 
    artist: string | null;
    eamuse_id: string | null;
    song_id: number | null;
    era: number | null;  // ADD THIS
  } | null;
}

// In matchesRule switch statement:
case 'era': {
  const songEra = score.musicdb?.era;
  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    if (songEra === null || songEra === undefined) return false;
    const matches = (value as number[]).includes(songEra);
    return operator === 'is' ? matches : !matches;
  }
  if (songEra === null || songEra === undefined) return false;
  const singleValue = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(singleValue)) return true;
  switch (operator) {
    case 'is': return songEra === singleValue;
    case 'is_not': return songEra !== singleValue;
    default: return true;
  }
}
```

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Scores.tsx` | Add `era` to `ScoreWithSong.musicdb` interface; implement era case in `matchesRule` |
| `src/components/filters/filterTypes.ts` | Add `ERA_OPTIONS` constant; update `getDefaultValue` for era |
| `src/components/filters/EraSelector.tsx` | **NEW FILE** - Visual chip selector for eras |
| `src/components/filters/FilterRuleRow.tsx` | Import EraSelector; update switch case for era |
| `src/hooks/useFilterResults.ts` | Add `era` to `ScoreData.musicdb`; implement era matching logic |

## Testing Checklist

1. Era chips appear in Song Detail Modal for all songs (Classic=0, White=1, Gold=2)
2. Era filter UI shows three visual chips (Classic, White, Gold)
3. Selecting "Classic" era filter shows only Classic era songs
4. Selecting multiple eras (e.g., Classic + Gold) shows songs from both eras
5. "Is not" operator correctly excludes selected eras
6. Filter preview count updates correctly when era filter is applied
