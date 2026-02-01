

# Fix: Update `calculate_goal_progress` RPC to Use `musicdb` as Source of Truth

## Problem

After dropping the redundant columns (`playstyle`, `difficulty_level`, `difficulty_name`) from the `user_scores` table, the `calculate_goal_progress` database function is now failing with:

```
column us.playstyle does not exist
```

The RPC function is still referencing these columns from `user_scores` (aliased as `us`) when it should be reading them from the joined `musicdb` table (aliased as `m`).

## Root Cause

The `calculate_goal_progress` function (created in migration `20260201195321`) references:
- `us.playstyle` (4 occurrences)
- `us.difficulty_level` (4 occurrences in filter conditions)
- `us.difficulty_name` (4 occurrences in filter conditions)

These columns no longer exist in `user_scores`.

## Solution

Create a new migration to update the RPC function. Replace all references to `user_scores` chart metadata columns with their `musicdb` equivalents:

| Before (broken) | After (fixed) |
|-----------------|---------------|
| `us.playstyle` | `m.playstyle` |
| `us.difficulty_level` | `m.difficulty_level` |
| `us.difficulty_name` | `m.difficulty_name` |

The function already has the required `JOIN public.musicdb m ON us.musicdb_id = m.id`, so the fix is simply changing the column qualifiers.

## Technical Details

### Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(...)
  -- All 4 target type blocks (lamp, grade, flare, score) updated:
  -- 1. Change "us.playstyle = 'SP'" → "m.playstyle = 'SP'"  
  -- 2. Change level filter "us.difficulty_level" → "m.difficulty_level"
  -- 3. Change difficulty filter "us.difficulty_name" → "m.difficulty_name"
```

### Files Changed

| File | Change |
|------|--------|
| **New Migration** | `CREATE OR REPLACE FUNCTION calculate_goal_progress` with corrected column references |

## Benefits

1. RPC function aligns with the "Single Source of Truth" architecture
2. Goal progress calculations will work again
3. No frontend changes needed - the hook already uses the correct RPC interface

