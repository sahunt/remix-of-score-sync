# Performance Optimizations

## Overview

This document details the performance optimizations implemented in the DDR Score Tracker application to ensure fast, responsive user experience even with large datasets.

---

## Caching Strategy

### React Query Cache Configuration

Since score data only changes when users upload new files, we use aggressive caching:

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,  // 30 minutes
      gcTime: 60 * 60 * 1000,     // 60 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: false,       // Don't refetch if data exists
      retry: 1,
    },
  },
});
```

### Upload-Triggered Cache Invalidation

A centralized hook invalidates all score-related caches after successful uploads:

```typescript
// src/hooks/useUploadInvalidation.ts
export function useUploadInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateAfterUpload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-scores'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
    queryClient.invalidateQueries({ queryKey: ['last-upload'] });
  }, [queryClient]);
  
  return { invalidateAfterUpload };
}
```

### MusicDB Catalog Cache

The song catalog rarely changes (admin updates only), so it uses near-permanent caching:

```typescript
// src/hooks/useMusicDbCount.ts
staleTime: Infinity,              // Never stale
gcTime: 24 * 60 * 60 * 1000,      // Keep for 24 hours
```

---

## PWA & Service Worker Caching

### VitePWA Configuration

The app uses `vite-plugin-pwa` for service worker caching:

| Cache Target | Strategy | Max Age |
|--------------|----------|---------|
| Song jacket images | CacheFirst | 30 days |
| Google Fonts | CacheFirst | 1 year |
| Static assets (JS/CSS) | Precache | Until rebuild |

### Runtime Caching Rules

```typescript
// vite.config.ts
runtimeCaching: [
  {
    urlPattern: /\/storage\/v1\/object\/public\/song-jackets\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "song-jackets-cache",
      expiration: {
        maxEntries: 2000,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  // ... Google Fonts caching
]
```

### Benefits

| Scenario | Before | After |
|----------|--------|-------|
| Repeat page loads | ~2-3s API calls | <100ms (cached) |
| Song jacket loading | Network every time | Instant from SW cache |
| Score list scroll | Lazy load each image | Pre-cached images |
| Offline capability | None | Basic offline with cached data |

---

Documentation of database and application optimizations implemented for scalability.

---

## Overview

These optimizations prepare the application to handle thousands of users with millions of score records by moving heavy computations from client-side JavaScript to server-side PostgreSQL.

---

## Database Indexes

### Stats Query Index
```sql
CREATE INDEX idx_user_scores_halo_stats 
ON public.user_scores(user_id, playstyle, halo);
```
**Purpose:** Optimizes lamp/halo counting queries (MFC, PFC, FC, etc.)

### Level + Timestamp Sorting Index
```sql
CREATE INDEX idx_user_scores_level_timestamp 
ON public.user_scores(user_id, playstyle, difficulty_level, timestamp DESC);
```
**Purpose:** Optimizes queries filtered by difficulty level and sorted by recency

### Pre-existing Indexes
- `user_scores(user_id, playstyle, difficulty_level)` - Main query pattern
- Various single-column indexes on `user_id`, `timestamp`, etc.

---

## Server-Side Stats Function

### `get_user_stats` RPC

Aggregates user score statistics directly in PostgreSQL instead of fetching all rows to JavaScript.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `p_user_id` | UUID | required | User's auth ID |
| `p_playstyle` | TEXT | 'SP' | Play style filter |
| `p_difficulty_level` | SMALLINT | NULL | Optional level filter |

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| `total_count` | BIGINT | Total played charts |
| `mfc_count` | BIGINT | Marvelous Full Combo count |
| `pfc_count` | BIGINT | Perfect Full Combo count |
| `gfc_count` | BIGINT | Great Full Combo count |
| `fc_count` | BIGINT | Full Combo count |
| `life4_count` | BIGINT | Life4 clear count |
| `clear_count` | BIGINT | All clears (any passing lamp) |
| `fail_count` | BIGINT | Failed attempts |
| `aaa_count` | BIGINT | AAA grade count |
| `avg_score` | BIGINT | Average score (rounded to 10s) |

**SQL Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_stats(
  p_user_id UUID,
  p_playstyle TEXT DEFAULT 'SP',
  p_difficulty_level SMALLINT DEFAULT NULL
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'mfc')::BIGINT,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'pfc')::BIGINT,
    -- ... additional aggregations
  FROM public.user_scores us
  JOIN public.musicdb m ON us.musicdb_id = m.id
  WHERE us.user_id = p_user_id
    AND us.playstyle = p_playstyle
    AND m.deleted = false
    AND (p_difficulty_level IS NULL OR us.difficulty_level = p_difficulty_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
```

---

## Frontend Integration

### `useUserStats` Hook

Located at `src/hooks/useUserStats.ts`

```typescript
import { useUserStats } from '@/hooks/useUserStats';

// Usage
const { data: stats, isLoading } = useUserStats(selectedLevel);

// Access stats
stats?.mfc_count
stats?.avg_score
```

**Caching:**
- `staleTime`: 5 minutes
- `gcTime`: 10 minutes

### Scores Page Integration

The Scores page (`src/pages/Scores.tsx`) uses a hybrid approach:

1. **Server-side stats** when viewing a single level without filters
2. **Client-side fallback** when filters are active (required for complex filter logic)

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Stats calculation | Fetch all rows → JS loop | Single SQL query |
| Memory usage | All scores in browser memory | Only aggregated counts |
| Response time | O(n) with data size | O(1) with indexes |
| Network payload | Full score objects | 10 integer values |

### Estimated Scale Thresholds

| Users | Rows | Expected Performance |
|-------|------|---------------------|
| 100 | ~450K | Excellent |
| 500 | ~2.25M | Excellent with indexes |
| 1,000 | ~4.5M | Good (may need Phase 3) |
| 10,000 | ~45M | Requires full optimization |

---

## Future Optimizations

### Phase 3: Infinite Scroll Pagination
Replace fetch-all with cursor-based pagination using `useInfiniteQuery` and Supabase `range()`.

### Phase 4: Server-Side Goal Progress
Move goal progress calculation to a `calculate_goal_progress` PostgreSQL function.

### Phase 5: Infrastructure
- Connection pooling configuration
- Read replicas for heavy read traffic
- Edge caching for static catalog data

---

## Related Files

| File | Purpose |
|------|---------|
| `src/hooks/useUserStats.ts` | Server-side stats hook |
| `src/hooks/useUserScores.ts` | Score fetching with pagination |
| `src/pages/Scores.tsx` | Stats integration |
| `src/components/scores/StatsSummary.tsx` | Stats display component |
| `.lovable/plan.md` | Implementation plan |
