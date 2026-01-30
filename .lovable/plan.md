

# Performance Optimization Plan

This plan addresses critical performance issues that are causing slow data loading, UI unresponsiveness, and poor experience for users with large data sets. The main user has 2,675 scores, and the musicdb catalog has 10,000+ charts - this volume requires careful optimization.

---

## Current Problems Identified

### 1. No List Virtualization
The Scores page renders ALL song cards at once (potentially hundreds). Each SongCard component:
- Loads external images with fallback logic
- Runs multiple state hooks
- Performs string normalization operations
- Creates complex DOM structures

### 2. Redundant Data Fetching
- **Home page**: Fetches ALL user scores (~2,700 rows) to calculate goal progress for each goal card
- **Goal Detail page**: Makes separate fetch for scores even though Home already loaded them
- **Scores page**: Has its own fetch logic separate from the shared `useUserScores` hook

### 3. Missing Database Indexes
No index exists for `user_scores.difficulty_level`, which is heavily used for filtering. Queries filter by `(user_id, playstyle, difficulty_level)` but only have indexes on `(user_id, musicdb_id)` and `(user_id, timestamp)`.

### 4. No React Query Caching Configuration
`QueryClient` is created with default settings - no `staleTime`, meaning every navigation triggers fresh API calls. The `useUserScores` hook doesn't set `staleTime`, causing unnecessary refetches.

### 5. Heavy Client-Side Processing
- Multiple `useMemo` computations filtering/sorting thousands of records
- Filter matching logic runs on every score in the dataset
- Stats calculations iterate through all scores multiple times

### 6. Image Loading Waterfall
- Each SongCard makes its own image request
- No image preloading or lazy loading for off-screen cards
- Failed images trigger fallback attempts, causing double requests

---

## Implementation Plan

### Phase 1: Database Index Optimization

**Add missing index for common query patterns:**

```sql
CREATE INDEX CONCURRENTLY idx_user_scores_level_filter 
ON public.user_scores (user_id, playstyle, difficulty_level);
```

This will dramatically speed up filtered queries like "show me all Level 14 scores."

---

### Phase 2: React Query Caching Strategy

**Update QueryClient configuration in `src/App.tsx`:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Update `useUserScores` hook to leverage caching:**

```typescript
return useQuery({
  queryKey: ['user-scores', user?.id, queryKeySuffix, ...],
  queryFn: async () => { ... },
  staleTime: 5 * 60 * 1000, // Scores don't change frequently
  gcTime: 10 * 60 * 1000,
  enabled: enabled && !!user?.id,
});
```

---

### Phase 3: List Virtualization for Scores Page

**Install and implement virtualization:**

```bash
npm install @tanstack/react-virtual
```

**Create VirtualizedSongList component:**

```typescript
// src/components/scores/VirtualizedSongList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedSongList({ songs, onSongClick }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Approximate SongCard height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-400px)] overflow-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: '100%',
            }}
          >
            <SongCard {...songs[virtualItem.index]} onClick={() => onSongClick(songs[virtualItem.index])} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

This means only ~15-20 cards render at once instead of hundreds.

---

### Phase 4: Lazy Image Loading

**Add native lazy loading to SongCard images:**

```typescript
// In SongCard.tsx
<img
  src={currentImgUrl!}
  alt=""
  loading="lazy"  // Browser-native lazy loading
  decoding="async"
  className="w-full h-full object-cover"
  onError={handleImageError}
/>
```

**Add intersection observer for more control (optional):**

```typescript
const [isVisible, setIsVisible] = useState(false);
const imgRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setIsVisible(entry.isIntersecting),
    { rootMargin: '100px' }
  );
  if (imgRef.current) observer.observe(imgRef.current);
  return () => observer.disconnect();
}, []);
```

---

### Phase 5: Deduplicate Score Fetching

**Refactor Home page to share cached scores:**

The Home page currently fetches all scores for every goal. Instead:

1. Fetch scores once at the layout level
2. Pass to child components via context or props
3. Let React Query cache prevent refetches on navigation

**Create ScoresProvider context:**

```typescript
// src/contexts/ScoresContext.tsx
const ScoresContext = createContext<{ scores: ScoreWithSong[]; isLoading: boolean }>();

export function ScoresProvider({ children }) {
  const { data: scores = [], isLoading } = useUserScores({ enabled: true });
  return (
    <ScoresContext.Provider value={{ scores, isLoading }}>
      {children}
    </ScoresContext.Provider>
  );
}
```

Wrap the AppLayout with this provider so all protected routes share the same cached data.

---

### Phase 6: Optimize Heavy Computations

**Add `useMemo` dependencies carefully and avoid recomputation:**

Current issue: `displayedScores` useMemo recomputes on every filter change, iterating through thousands of scores.

**Solution: Web Worker for heavy filtering (optional, advanced):**

For extreme cases, move filter logic to a web worker:

```typescript
// Filter worker handles heavy computation off main thread
const filterWorker = new Worker(new URL('./filterWorker.ts', import.meta.url));
filterWorker.postMessage({ scores, rules, matchMode });
filterWorker.onmessage = (e) => setFilteredScores(e.data);
```

**Simpler solution: Debounce filter changes:**

```typescript
const debouncedFilters = useDebounce(activeFilters, 150);
// Use debouncedFilters in useMemo dependencies
```

---

### Phase 7: Scores Page Query Consolidation

**Replace inline Supabase query with `useUserScores`:**

Currently, `Scores.tsx` has its own fetch logic (lines 228-308). Replace with:

```typescript
// Before: 80+ lines of custom fetch logic
// After: 3 lines using shared hook

const { data: allScores = [], isLoading } = useUserScores({
  filterRules: activeFilters.flatMap(af => af.filter.rules),
  enabled: shouldFetchScores,
});
```

This ensures consistent caching and eliminates duplicate code.

---

## Implementation Order

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 1 | Add database index | High | Low |
| 2 | Configure React Query caching | High | Low |
| 3 | Add list virtualization | Critical | Medium |
| 4 | Add lazy image loading | Medium | Low |
| 5 | Consolidate score fetching | High | Medium |
| 6 | Create ScoresProvider | Medium | Medium |
| 7 | Debounce/optimize computations | Medium | Medium |

---

## Expected Results

- **Initial load time**: 3-5 seconds reduced to under 1 second
- **Scroll performance**: Smooth 60fps scrolling with virtualization
- **Navigation**: Instant page transitions with cached data
- **Memory usage**: Reduced by ~80% (only visible cards in DOM)
- **Database load**: Fewer queries with proper caching

---

## Files to Modify

1. `src/App.tsx` - QueryClient configuration
2. `src/hooks/useUserScores.ts` - Add staleTime, optimize query
3. `src/pages/Scores.tsx` - Use virtualized list, consolidate fetch
4. `src/components/scores/SongCard.tsx` - Lazy image loading
5. **New file**: `src/components/scores/VirtualizedSongList.tsx`
6. **New file**: `src/contexts/ScoresContext.tsx`
7. **Database migration**: Add index on user_scores

