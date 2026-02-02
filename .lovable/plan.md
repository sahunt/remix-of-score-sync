
# Simplify Caching Architecture

## Problem

The app has **9 separate React Query caches** with inconsistent invalidation. After uploads, some caches refresh while others remain stale, causing the count mismatches you're seeing.

The core issues:
1. **Wrong query key in invalidation** - `useUploadInvalidation` invalidates `['goal-progress']` but the actual hook uses `['goal-progress-rpc']`
2. **Duplicate data paths** - GoalDetail fetches scores TWICE (via `useScores` AND `useUserScores` with different params)
3. **Client-side vs server-side mismatch** - Some pages use server RPC counts, others compute client-side

---

## Solution: Simplify to 3 Core Caches

Reduce from 9 caches to 3 essential ones:

| Cache | Purpose | Invalidation |
|-------|---------|--------------|
| `user-scores` | All user's played scores | After upload |
| `goals` | User's goal definitions | After goal CRUD |
| `musicdb` | Chart catalog (static) | Never (data is static) |

### What Gets Removed:
- `user-stats` → Calculate client-side from scores
- `goal-progress-rpc` → Calculate client-side from scores + goals
- `musicdb-count` → Calculate client-side from musicdb cache
- `goal` (individual) → Just filter from `goals` array

### What Gets Simplified:
- `all-charts-flat` and `all-song-charts` → Merge into single `musicdb` cache with both structures

---

## Implementation

### Step 1: Create Unified MusicDB Cache

Merge `useAllChartsCache` and `useSongChartsCache` into one hook that returns both the flat array AND the song_id map:

```typescript
// src/hooks/useMusicDb.ts
export function useMusicDb() {
  return useQuery({
    queryKey: ['musicdb'],
    queryFn: async () => {
      // Fetch all SP charts once
      const charts = await fetchAllCharts();
      
      return {
        charts,  // flat array for filtering
        bySongId: groupBySongId(charts),  // Map for modal lookup
      };
    },
    staleTime: Infinity,  // Never stale - catalog is static
    gcTime: 24 * 60 * 60 * 1000,  // Keep for 24 hours
  });
}
```

### Step 2: Remove Server-Side Stats/Progress Hooks

Delete:
- `useUserStats.ts` - Replace with client calculation
- `useServerGoalProgress.ts` - Replace with client calculation  
- `useMusicDbCount.ts` - Use musicdb cache length

### Step 3: Calculate Everything Client-Side

Since scores are already in memory via `useScores()`, derive everything from that:

```typescript
// In Scores.tsx
const stats = useMemo(() => {
  const levelScores = globalScores.filter(s => s.difficulty_level === selectedLevel);
  const catalogCount = musicDb.charts.filter(c => c.difficulty_level === selectedLevel).length;
  
  return {
    total: levelScores.length,
    noPlay: catalogCount - levelScores.length,
    mfc: levelScores.filter(s => s.halo === 'MFC').length,
    // ... etc
  };
}, [globalScores, musicDb, selectedLevel]);
```

### Step 4: Fix Upload Invalidation

Simplify to just 2 invalidations:

```typescript
// src/hooks/useUploadInvalidation.ts
export function useUploadInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateAfterUpload = useCallback(() => {
    // Only these two need invalidation
    queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  }, [queryClient]);
  
  return { invalidateAfterUpload };
}
```

### Step 5: Remove Aggressive Caching Config

Update App.tsx to use standard React Query behavior:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,  // Default - check on mount
      gcTime: 5 * 60 * 1000,  // 5 minutes
      refetchOnWindowFocus: false,  // Keep this off
      retry: 1,
    },
  },
});
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/hooks/useMusicDb.ts` | **Create** - Unified catalog cache |
| `src/hooks/useUserStats.ts` | **Delete** - Calculate inline |
| `src/hooks/useServerGoalProgress.ts` | **Delete** - Calculate inline |
| `src/hooks/useMusicDbCount.ts` | **Delete** - Use catalog cache |
| `src/hooks/useAllChartsCache.ts` | **Delete** - Merged into useMusicDb |
| `src/hooks/useSongChartsCache.ts` | **Delete** - Merged into useMusicDb |
| `src/hooks/useUploadInvalidation.ts` | **Simplify** - Only 2 invalidations |
| `src/contexts/ScoresContext.tsx` | **Keep** - No changes |
| `src/pages/Home.tsx` | **Update** - Use new hooks |
| `src/pages/Scores.tsx` | **Update** - Client-side stats |
| `src/pages/GoalDetail.tsx` | **Update** - Remove duplicate fetching |
| `src/App.tsx` | **Update** - Remove aggressive cache config |
| `src/components/home/GoalCard.tsx` | **Update** - Progress calculated from parent |
| `docs/architecture-rules.md` | **Update** - Document new approach |

---

## Benefits

1. **Single Source of Truth** - Scores come from one place, stats derived from that
2. **Consistent Counts** - No more mismatch between server RPC and client calculations
3. **Simpler Mental Model** - Only 3 caches to think about
4. **Faster Updates** - No waiting for multiple RPCs after upload
5. **Easier Debugging** - If counts are wrong, check the one scores array

---

## Trade-offs

- **More Client CPU** - Calculating stats from 5000 scores on every render
  - Mitigation: `useMemo` ensures calculation only runs when data changes
  
- **Initial Load Time** - Must load all scores before showing anything
  - Currently already happening via ScoresProvider

---

## Technical Notes

### Memory Considerations

The app already loads all ~5000 scores into memory via `ScoresProvider`. Adding the ~10,000 chart catalog is acceptable (~2MB total). Modern devices handle this easily.

### The Static Catalog Optimization

The musicdb catalog (chart definitions) only changes when the game adds new songs - roughly once per month via admin import. Setting `staleTime: Infinity` for this cache is safe and eliminates all catalog-related refetches.

### Why Remove Server RPCs?

The `get_user_stats` and `calculate_goal_progress` RPCs were added to offload calculation to PostgreSQL. However, since we already have all scores in memory for the virtualized list, recalculating client-side is instantaneous and eliminates cache synchronization issues.
