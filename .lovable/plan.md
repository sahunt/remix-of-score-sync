

# Fix Goal Detail Page Showing Incorrect Progress Data

## Problem Summary

The Goal Detail page displays incorrect chart counts:
- **Home page shows**: 246/253 completed (correct ✓)
- **Goal Detail shows**: Remaining (38) + Completed (233) = 271 total (incorrect ✗)

The expected values are:
- Completed: 246 (PFC or better)
- Remaining: 7 (2 GFC + 5 unplayed)
- Total: 253

## Root Cause Analysis

**Supabase PostgREST Relation Filter Behavior**

When filtering on a relation like `musicdb.difficulty_level`, PostgREST by default performs a LEFT JOIN:
1. Returns ALL parent rows (`user_scores`)
2. Sets the nested relation to `null` when it doesn't match the filter
3. Pagination then operates on these null-filled results

**Example from network logs:**
```json
{"id":"...", "musicdb_id":53, "musicdb":null},  // Level != 14, musicdb set to null
{"id":"...", "musicdb_id":54, "musicdb":null},  // Level != 14, musicdb set to null
{"id":"...", "musicdb_id":5125, "musicdb":{"difficulty_level":14, ...}},  // Level 14, musicdb populated
```

The current code fetches 1000 rows per page, but most have `musicdb: null`. After filtering these out client-side, the pagination breaks because we're skipping over valid level-14 scores that are scattered across multiple pages.

**Impact:**
- Goal progress calculations are based on incomplete/incorrect data
- The completed/remaining song lists show wrong songs
- Tab counts don't match the progress card total

## Solution

### 1. Use `!inner` Modifier for Relation Filtering

Change the select statement to use `!inner` which converts the LEFT JOIN to an INNER JOIN, ensuring only rows with matching relations are returned:

**File: `src/hooks/useUserScores.ts`**

```typescript
// Before (broken)
.select(`
  id, score, timestamp, rank, flare, halo, source_type, musicdb_id,
  musicdb(name, artist, eamuse_id, song_id, deleted, era, name_romanized, difficulty_name, difficulty_level, playstyle)
`)
.eq('musicdb.playstyle', 'SP')
.in('musicdb.difficulty_level', [14])

// After (fixed)
.select(`
  id, score, timestamp, rank, flare, halo, source_type, musicdb_id,
  musicdb!inner(name, artist, eamuse_id, song_id, deleted, era, name_romanized, difficulty_name, difficulty_level, playstyle)
`)
.eq('musicdb.playstyle', 'SP')
.in('musicdb.difficulty_level', [14])
```

With `!inner`, PostgREST will:
1. Only return parent rows where the relation exists AND matches ALL filters
2. Pagination will work correctly because each page contains exactly 1000 matching rows
3. No more null musicdb relations to filter out

### 2. Conditional Inner Join for Filtered vs Unfiltered Queries

The global scores cache (used by `ScoresContext`) should NOT use `!inner` because it needs ALL scores (no criteria filters). But goal-specific queries with `filterRules` should use `!inner`.

**Logic:**
```typescript
const hasFilters = !!levelRule || !!difficultyRule;
const musicdbSelect = hasFilters 
  ? 'musicdb!inner(...)'  // INNER JOIN when filtering
  : 'musicdb(...)';       // LEFT JOIN for full fetch
```

### 3. Also Fix the Global ScoresContext Query

The global query in `ScoresContext` uses `useUserScores` without filter rules. It still needs `!inner` for the playstyle filter to exclude DP charts:

```typescript
.select(`
  ...,
  musicdb!inner(...)
`)
.eq('musicdb.playstyle', 'SP')
```

This ensures only SP charts are returned, and pagination works correctly for users with mixed SP/DP scores (if they exist).

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useUserScores.ts` | Add `!inner` to musicdb relation select |

### Key Code Changes

**`src/hooks/useUserScores.ts`** (line ~50-68):

```typescript
// Build the musicdb join - use !inner to ensure INNER JOIN behavior
// This is critical for pagination: without !inner, PostgREST returns ALL parent rows
// with musicdb: null for non-matching relations, breaking paginated result counts
const musicdbJoin = 'musicdb!inner(name, artist, eamuse_id, song_id, deleted, era, name_romanized, difficulty_name, difficulty_level, playstyle)';

let query = supabase
  .from('user_scores')
  .select(`
    id,
    score,
    timestamp,
    rank,
    flare,
    halo,
    source_type,
    musicdb_id,
    ${musicdbJoin}
  `)
  .eq('user_id', user.id)
  .eq('musicdb.playstyle', 'SP');
```

### Why This Fixes Everything

1. **Correct Pagination**: Each page contains exactly 1000 valid, filtered rows
2. **Accurate Counts**: Goal progress calculations receive the correct set of scores
3. **Proper Tab Lists**: Completed/Remaining song lists show the right songs
4. **Consistent Totals**: Tab counts will match the goal card progress (e.g., 7 remaining = 2 GFC + 5 unplayed)

### Alternative Considered: Server-Side RPC

We could create a dedicated RPC for goal detail data, similar to `calculate_goal_progress`. However:
- The current `!inner` fix is simpler and aligns with existing architecture
- It fixes the issue for ALL filtered score queries, not just goals
- No database migration required

## Testing Checklist

1. Open Goal Detail for "PFC on all 14s" goal
2. Verify card shows 246/253 (same as home)
3. Verify tabs show Remaining (7) and Completed (246)
4. Check Remaining tab includes 2 GFC songs + 5 unplayed
5. Click on songs to verify modal works correctly
6. Navigate to Scores page and verify all scores load (global unfiltered query)
7. Create a new goal with different criteria and verify progress is correct

