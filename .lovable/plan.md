

# Fix Score Data Uniformity Across the App

## Problem Summary

The Scores page shows incorrect statistics:
- **Displayed**: Total: 234, No Play: 37 (271 total)
- **Expected**: Total: 248, No Play: 5 (253 total)

This is caused by the `get_user_stats` database function still referencing dropped columns from `user_scores`.

## Root Cause

The `get_user_stats` RPC function references `us.playstyle` and `us.difficulty_level` from the `user_scores` table (aliased as `us`), but these columns were dropped in a previous schema optimization. The function should read these values from the joined `musicdb` table (aliased as `m`) instead.

When this RPC fails, the frontend falls back to client-side stat calculation. However, if the React Query cache contains stale data from before the pagination fix, the displayed numbers will be incorrect.

## Solution

### 1. Fix the `get_user_stats` RPC Function

Create a migration to update the function with the correct column references:

| Current (broken) | Fixed |
|------------------|-------|
| `us.playstyle = p_playstyle` | `m.playstyle = p_playstyle` |
| `us.difficulty_level = p_difficulty_level` | `m.difficulty_level = p_difficulty_level` |

### 2. Technical Changes

**New Migration SQL:**

```sql
CREATE OR REPLACE FUNCTION public.get_user_stats(
  p_user_id UUID,
  p_playstyle TEXT DEFAULT 'SP',
  p_difficulty_level SMALLINT DEFAULT NULL
)
RETURNS TABLE(
  total_count BIGINT,
  mfc_count BIGINT,
  pfc_count BIGINT,
  gfc_count BIGINT,
  fc_count BIGINT,
  life4_count BIGINT,
  clear_count BIGINT,
  fail_count BIGINT,
  aaa_count BIGINT,
  avg_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'mfc')::BIGINT as mfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'pfc')::BIGINT as pfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'gfc')::BIGINT as gfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'fc')::BIGINT as fc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'life4')::BIGINT as life4_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) IN ('clear','life4','fc','gfc','pfc','mfc'))::BIGINT as clear_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'fail')::BIGINT as fail_count,
    COUNT(*) FILTER (WHERE UPPER(us.rank) = 'AAA')::BIGINT as aaa_count,
    COALESCE((ROUND(AVG(us.score) / 10) * 10)::BIGINT, 0) as avg_score
  FROM public.user_scores us
  JOIN public.musicdb m ON us.musicdb_id = m.id
  WHERE us.user_id = p_user_id
    AND m.playstyle = p_playstyle           -- Changed from us.playstyle
    AND m.deleted = false
    AND (p_difficulty_level IS NULL OR m.difficulty_level = p_difficulty_level);  -- Changed from us.difficulty_level
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
```

## Files Changed

| File | Change |
|------|--------|
| **New Migration** | `CREATE OR REPLACE FUNCTION get_user_stats` with corrected column references |

## Why This Fixes Everything

1. **Server-side stats work again**: The RPC will successfully return accurate counts directly from the database
2. **Consistent data source**: Both `get_user_stats` and `calculate_goal_progress` now read chart metadata from `musicdb`
3. **No frontend changes needed**: The `useUserStats` hook already handles the RPC response correctly
4. **Cache invalidation**: Once the RPC works, React Query will cache fresh, correct data

## Testing Checklist

After applying this fix:
1. Navigate to the Scores page and select level 14
2. Verify Total shows 248 (matching database count)
3. Verify No Play shows 5 (253 total charts - 248 played)
4. Verify MFC, PFC, AAA counts match expected values
5. Navigate to Home page and verify goal progress still displays correctly
6. Create a new goal and verify the progress calculation works

