

# Scalability Phase 1 & 2: Indexes and Server-Side Stats

## Summary
Add missing database indexes to optimize query performance and create a server-side SQL function for stats aggregation to reduce client-side JavaScript processing.

---

## Phase 1: Database Indexes

### 1A. Add Stats Query Index
The Scores page counts by `halo` (lamp type) which needs optimization:

```sql
CREATE INDEX idx_user_scores_halo_stats 
ON public.user_scores(user_id, playstyle, halo);
```

### 1B. Add Level + Timestamp Sorting Index
Scores are frequently filtered by level and sorted by timestamp:

```sql
CREATE INDEX idx_user_scores_level_timestamp 
ON public.user_scores(user_id, playstyle, difficulty_level, timestamp DESC);
```

---

## Phase 2: Server-Side Stats Function

### 2A. Create Database Function

Replace client-side lamp counting with a PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION get_user_stats(
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
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'mfc')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'pfc')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'gfc')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'fc')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'life4')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) IN ('clear','life4','fc','gfc','pfc','mfc'))::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(halo) = 'fail')::BIGINT,
    COUNT(*) FILTER (WHERE UPPER(rank) = 'AAA')::BIGINT,
    COALESCE((ROUND(AVG(score) / 10) * 10)::BIGINT, 0)
  FROM user_scores us
  JOIN musicdb m ON us.musicdb_id = m.id
  WHERE us.user_id = p_user_id
    AND us.playstyle = p_playstyle
    AND m.deleted = false
    AND (p_difficulty_level IS NULL OR us.difficulty_level = p_difficulty_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 2B. Create Hook for Server-Side Stats

| File | Change |
|------|--------|
| `src/hooks/useUserStats.ts` | New hook to call `get_user_stats` RPC |
| `src/pages/Scores.tsx` | Replace JS stats calculation with `useUserStats` hook |
| `src/components/scores/StatsSummary.tsx` | Update to accept server-provided stats |

### 2C. New Hook Implementation

```typescript
// src/hooks/useUserStats.ts
export function useUserStats(level: number | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-stats', user?.id, level],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: user?.id,
        p_playstyle: 'SP',
        p_difficulty_level: level,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database | Add 2 indexes + `get_user_stats` function |
| `src/hooks/useUserStats.ts` | New file - hook for server-side stats |
| `src/pages/Scores.tsx` | Use new hook instead of JS calculations |
| `src/components/scores/StatsSummary.tsx` | Accept stats as props |

---

## Benefits

| Improvement | Before | After |
|-------------|--------|-------|
| Stats query | Fetch all rows + JS loop | Single SQL aggregation |
| Index coverage | Missing halo index | Optimized for stats queries |
| Memory usage | All scores in memory | Only aggregated counts |
| Response time | Grows with data size | Constant (indexed) |

---

## No Breaking Changes

- Existing functionality unchanged
- Stats display same data, just computed server-side
- Indexes are additive (no schema changes)
- Gradual migration - can keep JS fallback initially

