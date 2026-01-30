
# Upload Summary - Show What Changed

## Overview
Add a detailed "Changes" section to the upload results UI that shows exactly which songs had improvements, with their old → new values. This provides transparency into what the upload actually changed.

## User Experience

When an upload completes with updates, users will see:
1. The existing 6 stat blocks (Total Rows, Mapped, Skipped, New, Updated, Unchanged)
2. A new "Changes" section showing individual songs that were updated
3. Each row shows: difficulty chip + song name + score change + improvement chips (Flare/Rank/Grade)
4. A "See all" button to expand/collapse if there are many changes

Only songs with actual improvements are shown. If a song had PFC → PFC with no other changes, it won't appear in this list.

---

## Technical Approach

### 1. Edge Function: Track Detailed Changes

Modify `supabase/functions/process-upload/index.ts` to capture before/after data for each updated score.

**Add new interface:**
```typescript
interface ScoreChange {
  song_name: string;
  difficulty_name: string;
  difficulty_level: number;
  old_score: number | null;
  new_score: number | null;
  old_flare: number | null;
  new_flare: number | null;
  old_rank: string | null;
  new_rank: string | null;
  old_halo: string | null;
  new_halo: string | null;
}
```

**Modify `fetchExistingScores`:**
- Also fetch the song name from musicdb join (or store it in existing query)
- Need song_name, difficulty_name, difficulty_level for display

**Modify `smartUpsertScores`:**
- Return an array of `ScoreChange` objects alongside the counts
- Only include entries where at least one value changed

**Update parse_summary storage:**
- Add `changes: ScoreChange[]` to the summary JSON stored in the uploads table

### 2. Frontend: Update UploadResult Interface

In `src/pages/Upload.tsx`, extend the interface:

```typescript
interface ScoreChange {
  song_name: string;
  difficulty_name: string;
  difficulty_level: number;
  old_score: number | null;
  new_score: number | null;
  old_flare: number | null;
  new_flare: number | null;
  old_rank: string | null;
  new_rank: string | null;
  old_halo: string | null;
  new_halo: string | null;
}

interface UploadResult {
  // ... existing fields
  changes?: ScoreChange[];
}
```

### 3. Frontend: Add Changes Summary Component

Create a new section in the success state that displays changes:

- Styled as a dark card container (bg-[#3B3F51] rounded-lg)
- Header: "Updated Scores" with count
- Each row contains:
  - Difficulty chip (14x14, colored by difficulty name)
  - Song name (10px uppercase Poppins)
  - Score change: "998,670 → 999,980" format
  - Improvement chips (only shown if that field improved):
    - FlareChip for flare improvement
    - HaloChip for grade improvement (PFC, MFC, etc.)
    - Rank badge for rank improvement (optional, may skip for simplicity)
- Collapsible with "See all" button if > 5 changes
- Don't show chip if old === new (e.g., PFC → PFC shows nothing)

### 4. Visual Reference (from mockup)

```text
┌──────────────────────────────────────────────────────┐
│  14  ROMANCING LAYER  998,670 → 999,980  [✨PFC]     │
│  14  1116  999,670 → 999,980                         │
│  14  ROMANCING LAYER  998,670 → 999,980  [✨PFC]     │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│                    See all ∨                         │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Edge Function Types
- Add `ScoreChange` interface
- Update `UpsertResult` to include `changes` array

### Step 2: Modify fetchExistingScores
- Join with musicdb to get song_name, difficulty_name, difficulty_level
- Return enriched existing score data

### Step 3: Modify smartUpsertScores
- Track changes for each update
- Return changes array with before/after values

### Step 4: Update parse_summary storage
- Include changes in the summary JSON

### Step 5: Update Upload.tsx
- Add ScoreChange interface
- Parse changes from result
- Create collapsible changes list UI

### Step 6: Create Changes Row Component
- Difficulty chip with color
- Song name
- Score transition (old → new) with number formatting
- Conditional FlareChip (if flare improved)
- Conditional HaloChip (if halo/grade improved)

---

## Files to Modify

1. `supabase/functions/process-upload/index.ts`
   - Add ScoreChange interface
   - Modify fetchExistingScores to include song metadata
   - Modify smartUpsertScores to track and return changes
   - Include changes in parse_summary

2. `src/pages/Upload.tsx`
   - Add ScoreChange interface
   - Parse changes from result
   - Add new Changes section with collapsible list

---

## Edge Cases

1. **No changes**: Don't show the changes section
2. **Many changes**: Collapse to first 5 rows with "See all" expander
3. **Score-only change**: Show score transition, no chips
4. **Grade-only change**: Show score (may be same), show new HaloChip
5. **Flare-only change**: Show score, show new FlareChip
6. **Multiple improvements**: Show all applicable chips

## Dependencies

Uses existing components:
- FlareChip from `@/components/ui/FlareChip`
- HaloChip from `@/components/ui/HaloChip`
- getDifficultyColorClass pattern from SongCard
