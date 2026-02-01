

# Performance Audit: Edi (DDR Score Tracker)

## Executive Summary

After a thorough review of the codebase, I've identified **7 critical optimization opportunities** across three categories: code duplication, data fetching inefficiencies, and architectural concerns. Addressing these will reduce bundle size, improve runtime performance, and make the codebase more maintainable.

---

## Critical Issue #1: Triplicated `matchesRule` Function

**Severity: High | Impact: Maintainability + Bundle Size**

The exact same filter matching logic is duplicated in **three separate files**:

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/Scores.tsx` | 101-219 | Filtering displayed scores |
| `src/hooks/useFilterResults.ts` | 20-148 | Filter preview counting |
| `src/hooks/useGoalProgress.ts` | 5-76 | Goal progress filtering |

Each implementation is ~120 lines with identical logic for comparing scores, levels, grades, lamps, eras, etc.

**Problems:**
- When you added era filtering, you had to update 3 files
- Bug fixes must be applied 3 times
- Adds ~350 lines of duplicated code to bundle

**Fix:** Extract to a single `matchesFilterRule` utility:
```
src/lib/filterMatcher.ts
├── matchesRule(score, rule) - core matching logic
├── filterScoresByRules(scores, rules, matchMode) - bulk filtering
└── Export shared ScoreData interface
```

---

## Critical Issue #2: Duplicate `ScoreWithSong` Interface Definitions

**Severity: Medium | Impact: Type Safety + Maintenance**

The `ScoreWithSong` interface is defined in **multiple locations** with slight variations:

| Location | Includes era? | Includes source_type? | Includes musicdb_id? |
|----------|--------------|----------------------|---------------------|
| `useGoalProgress.ts` (canonical) | Yes | No | Yes |
| `Scores.tsx` (local) | Yes | Yes | No (uses musicdb.song_id) |
| `useFilterResults.ts` (local) | Yes | No | No |

**Problems:**
- Scores.tsx imports `GlobalScoreWithSong` but then redefines a local `ScoreWithSong` anyway
- Fields get out of sync (e.g., `name_romanized` exists locally but not in global)
- TypeScript can't catch mismatches between pages

**Fix:** Create a single source of truth:
```typescript
// src/types/scores.ts
export interface ScoreWithSong {
  id: string;
  score: number | null;
  timestamp?: string | null;
  playstyle: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  source_type?: string | null;
  musicdb_id?: number | null;
  musicdb: {
    name: string | null;
    artist: string | null;
    eamuse_id: string | null;
    song_id: number | null;
    name_romanized?: string | null;
    era: number | null;
    deleted?: boolean | null;
  } | null;
  // For unplayed charts
  isUnplayed?: boolean;
}
```

---

## Critical Issue #3: Scores Page Bypasses Global Cache

**Severity: High | Impact: Network Efficiency + Memory**

The `ScoresContext` was created to provide a single cached source of scores, but `Scores.tsx` **completely ignores it**:

```typescript
// Line 224 in Scores.tsx - explicitly removed!
// Removed: globalScores from useScores() - now using local scores state for modal preloading
const [scores, setScores] = useState<ScoreWithSong[]>([]);
```

**What happens:**
1. Home.tsx fetches ALL user scores via `useUserScores()` (global cache)
2. Scores.tsx fetches scores AGAIN via direct Supabase query (local state)
3. GoalDetail.tsx fetches scores AGAIN via `useUserScores()` with different query key

**Impact:** Users with 4,500+ scores are fetching that data 2-3x as they navigate.

**Fix:** Unify data fetching:
- Remove the local fetch in Scores.tsx
- Consume scores from ScoresProvider (which wraps all protected routes)
- Pass level/filters to `useUserScores` for DB-level optimization
- Use client-side filtering from the cached set for display

---

## Critical Issue #4: GoalDetail Makes Redundant Chart Queries

**Severity: Medium | Impact: Network Requests**

GoalDetail.tsx fetches unplayed charts like this:

```typescript
// Line 51-81 in GoalDetail.tsx
const { data: allMatchingCharts = [] } = useQuery({
  queryKey: ['musicdb-charts-for-goal', goal?.id],
  queryFn: async () => {
    let query = supabase.from('musicdb')
      .select('id, name, artist, eamuse_id, song_id, difficulty_level, difficulty_name, playstyle')
      // ... filters
  },
});
```

**But the app already has:**
- `useSongChartsCache()` - fetches ALL 10,000+ SP charts and caches them for 30 minutes
- `useMusicDbCount()` - server-side counting with filters

**Fix:** 
1. Reuse `useSongChartsCache` to identify unplayed charts client-side
2. Filter the cached charts by goal criteria
3. Eliminate the redundant query per goal

---

## Critical Issue #5: Unused ScoresProvider Context

**Severity: Low | Impact: Dead Code + Confusion**

`ScoresContext.tsx` exists and is documented in architecture memories, but:

1. It's **not imported** in `App.tsx` - no `<ScoresProvider>` wraps the routes
2. `Scores.tsx` has a comment saying it was "removed" in favor of local state
3. `Home.tsx` uses `useUserScores()` directly, not `useScores()` context

**The result:** A context was created, documented, but never actually integrated.

**Fix:** Either:
- (A) Remove `ScoresContext.tsx` entirely and update docs
- (B) Actually integrate it: wrap routes in `<ScoresProvider>` and consume via `useScores()` hook

---

## Critical Issue #6: Stats Calculation Fallback Runs Redundantly

**Severity: Medium | Impact: CPU on Mobile**

In Scores.tsx (lines 593-690), stats are calculated:

```typescript
const { stats, averageScore } = useMemo(() => {
  // Case 1: Use server-side stats when available
  if (serverStats && selectedLevel !== null && activeFilters.length === 0) {
    return { stats: [...], averageScore: serverStats.avg_score };
  }
  
  // Case 2: Fall back to client-side calculation
  let filteredForStats = [...scores];
  // Re-filters the ENTIRE score array with the same matchesRule logic
  // that was already applied to create displayedScores
});
```

**Problem:** When filters are active, the same scores are filtered twice:
1. First in `displayedScores` useMemo (line 444)
2. Again in stats calculation useMemo (line 593)

**Fix:** Derive stats from `displayedScores` directly:
```typescript
const stats = useMemo(() => {
  // displayedScores already has filters applied
  const playedSongs = displayedScores.filter(s => !s.isNoPlay);
  // Calculate MFC, PFC, etc. from playedSongs
}, [displayedScores]);
```

---

## Critical Issue #7: Database Query Inefficiency in Goal Progress

**Severity: Medium | Impact: Scalability**

Each goal on the Home page triggers:
1. `useMusicDbCount()` - 1 query per goal
2. `useGoalProgress()` - filters scores client-side

With 5 goals, that's 5 count queries on page load.

**Fix (Phase 4 from docs):** Create a server-side `calculate_goal_progress` RPC:
```sql
CREATE FUNCTION calculate_goal_progress(
  p_user_id UUID,
  p_criteria_rules JSONB,
  p_target_type TEXT,
  p_target_value TEXT
) RETURNS TABLE(completed INT, total INT)
```

This moves all goal calculations to PostgreSQL, returning only the final numbers.

---

## Summary: Recommended Refactoring Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Extract `matchesRule` to shared utility | Low | High (maintainability) |
| 2 | Consolidate `ScoreWithSong` types | Low | Medium (type safety) |
| 3 | Integrate or remove ScoresProvider | Medium | Medium (cleanup) |
| 4 | Derive stats from displayedScores | Low | Medium (CPU reduction) |
| 5 | Reuse songChartsCache in GoalDetail | Medium | Medium (fewer queries) |
| 6 | Unify Scores.tsx with global cache | High | High (network/memory) |
| 7 | Server-side goal progress RPC | High | High (scalability) |

---

## Immediate Quick Wins (Can Do Now)

1. **Extract matchesRule** - Create `src/lib/filterMatcher.ts`, import in 3 files
2. **Create shared types** - Create `src/types/scores.ts` with canonical interface
3. **Fix stats derivation** - Use displayedScores instead of re-filtering

Would you like me to implement any of these optimizations?

