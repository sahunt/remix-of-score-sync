

# Musicdb "Deleted" Songs Feature Plan

## Overview

This update introduces a `deleted` boolean column to the `musicdb` table to distinguish between active songs (available in the current game version) and deleted songs (removed from the game but may have historical scores). 

**Important Clarification on the Data:**
- The **existing** rows in musicdb are the **active songs** (deleted = FALSE)
- The **new songs** from the CSV are the **deleted songs** (deleted = TRUE)
- Deleted songs should be completely hidden from all UI, calculations, goals, and catalog counts

## Data Analysis

The CSV contains **209 chart entries** representing **47 unique deleted songs** (identified by unique eamuse_id values). Since these songs don't exist in musicdb yet, we need to:
1. Generate new song_ids for them (starting from max + 1 = 38887)
2. Generate chart_ids using the formula: `(song_id * 100) + difficulty_position`
3. Insert them with `deleted = TRUE`

Difficulty position mapping for SP:
- BEGINNER = 0
- BASIC = 1
- DIFFICULT = 2
- EXPERT = 3
- CHALLENGE = 4

---

## Phase 1: Database Schema Update

### Migration

Add the `deleted` column with default value `FALSE`, then set all existing rows to `FALSE` (active songs):

```sql
ALTER TABLE musicdb 
ADD COLUMN deleted boolean NOT NULL DEFAULT FALSE;
```

Since the default is FALSE, all 10,308 existing rows will automatically be marked as active.

---

## Phase 2: Insert Deleted Songs via Edge Function

### New Edge Function: `import-deleted-songs`

Create an edge function that:
1. Accepts CSV content with columns: `eamuse_id, title, difficulty_level, difficulty_name, playstyle`
2. Groups rows by unique `eamuse_id` to identify unique songs
3. For each unique song, checks if `eamuse_id` already exists in musicdb
   - If exists: Update those rows to set `deleted = TRUE`
   - If not exists: Generate a new `song_id` and insert all chart rows
4. Generates `chart_id` using the standard formula
5. Inserts with `deleted = TRUE`

---

## Phase 3: Filter Deleted Songs from All Queries

Every query that reads from `musicdb` must exclude deleted songs. The affected locations are:

### 3.1 `src/hooks/useMusicDbCount.ts`
Add `.eq('deleted', false)` to the query that counts catalog charts.

### 3.2 `src/pages/Scores.tsx`
Add `.eq('deleted', false)` to the fetchMusicDbCharts query (around line 324).

### 3.3 `src/pages/GoalDetail.tsx`
Add `.eq('deleted', false)` to the musicdb charts query (around line 55).

### 3.4 `src/components/scores/SongDetailModal.tsx`
Add `.eq('deleted', false)` to the charts query (around line 119).

### 3.5 `src/hooks/useUserScores.ts`
The user_scores table joins to musicdb - we need to ensure the join excludes deleted songs, or filter them out client-side. The safest approach is to add a filter on the joined musicdb relation or handle in the client layer.

---

## Phase 4: Update TypeScript Types

### `src/integrations/supabase/types.ts`
This file is auto-generated, but after the migration runs, it will automatically include the `deleted` field.

---

## Technical Details

### Chart ID Generation for New Songs

For each unique eamuse_id, we assign a new song_id starting from 38887. The chart_id formula:

```text
song_id * 100 + difficulty_position

Where difficulty_position:
  BEGINNER = 0
  BASIC = 1
  DIFFICULT = 2
  EXPERT = 3
  CHALLENGE = 4
```

### Song Data from CSV

| eamuse_id | title | Charts (levels) |
|-----------|-------|-----------------|
| 00ibl6biOOOdDd96OP0P0i8iObo8i09d | Realize | BEG:3, BAS:6, DIF:11, EXP:14 |
| 00q86iQQIIiOlqi6Doqi6b9PiOodo10O | Believe | BEG:2, BAS:4, DIF:9, EXP:11 |
| (47 unique songs total with ~209 chart rows) |

### Why Not Check by `eamuse_id` Before Filtering?

Since the deleted songs are new to the database (none of the 47 eamuse_ids exist in musicdb yet), we can safely:
1. Insert all 209 chart rows with `deleted = TRUE`
2. No risk of duplicates since eamuse_ids don't exist

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database Migration | Create | Add `deleted` boolean column |
| `supabase/functions/import-deleted-songs/index.ts` | Create | Edge function to process CSV and insert deleted songs |
| `src/hooks/useMusicDbCount.ts` | Modify | Add `.eq('deleted', false)` |
| `src/pages/Scores.tsx` | Modify | Add `.eq('deleted', false)` |
| `src/pages/GoalDetail.tsx` | Modify | Add `.eq('deleted', false)` |
| `src/components/scores/SongDetailModal.tsx` | Modify | Add `.eq('deleted', false)` |
| `src/hooks/useUserScores.ts` | Modify | Filter out scores linked to deleted songs |

---

## Execution Order

1. Run database migration to add `deleted` column
2. Create and deploy `import-deleted-songs` edge function
3. Update all frontend queries to filter by `deleted = false`
4. Call the edge function with the CSV data to insert the 209 deleted song charts
5. Verify counts: should still show same catalog totals since deleted songs are filtered out

