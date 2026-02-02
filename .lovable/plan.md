

# Data Integrity & Pre-Scale Foundation

## Overview

This plan creates a **Data Integrity Checklist** document and implements **foundational database changes** that MUST be in place before scaling to 100+ users. These are low-risk, high-impact changes that are much safer to implement now than after data accumulates.

---

## Part 1: Data Integrity Checklist Document

Create `docs/data-integrity-checklist.md` with the lessons learned and rules to prevent future bugs.

### Document Contents

```text
# Data Integrity Checklist

Rules to prevent data consistency bugs. Review before any data-related changes.

---

## Golden Rules

### 1. ID-Based Matching Only
❌ NEVER: `${song_id}|${difficulty_name}` (composite string keys)
✅ ALWAYS: `musicdb_id` ↔ `chart.id` (database foreign keys)

### 2. Deterministic Pagination
All paginated queries MUST have stable ordering:
```typescript
.order('timestamp', { ascending: false, nullsFirst: false })
.order('id', { ascending: true })  // REQUIRED secondary sort
```

### 3. Single Source of Truth
| Data | Source | Never Use |
|------|--------|-----------|
| Chart metadata | `musicdb` table | `user_scores` columns |
| User achievements | `user_scores` | Derived/cached values |
| Catalog counts | `musicdb` query | Hardcoded numbers |

### 4. Math Must Always Balance
```
catalog_count === played_count + unplayed_count
```
Add dev-mode assertions to verify this invariant.

### 5. INNER JOIN for Filtering
When filtering by related table fields, use `!inner`:
```typescript
// ✅ Correct - ensures INNER JOIN
.select('*, musicdb!inner(*)')
.eq('musicdb.playstyle', 'SP')

// ❌ Wrong - LEFT JOIN returns null relations
.select('*, musicdb(*)')
.eq('musicdb.playstyle', 'SP')
```

---

## Pre-Change Checklist

Before modifying data fetching or display logic:

- [ ] Does this query use `musicdb_id`/`chart.id` for matching?
- [ ] Does pagination have deterministic ordering (timestamp + id)?
- [ ] Does filtering use `!inner` join modifier?
- [ ] Are counts derived from the same filtered dataset?
- [ ] Is there a dev-mode assertion for count invariants?

---

## Post-Change Verification

After any data-related changes:

- [ ] Level 14: Total + No Play = 253 (catalog count)
- [ ] Level 11: Total + No Play = 382 (catalog count)
- [ ] Navigate away and back - counts stay consistent
- [ ] Upload new scores - counts update correctly
- [ ] Check browser console for integrity warnings

---

## Common Bugs & Fixes

### Bug: Counts differ between pages
**Cause**: Different pages using different matching logic
**Fix**: All pages must use `useScores()` context, not local queries

### Bug: "No Play" count too high
**Cause**: Composite key matching fails on null fields
**Fix**: Use `playedMusicDbIds.has(chart.id)` instead of string matching

### Bug: Duplicate scores appearing
**Cause**: Pagination without secondary sort key
**Fix**: Add `.order('id', { ascending: true })` after timestamp sort

### Bug: Filtered results incorrect with pagination
**Cause**: LEFT JOIN returns null relations that fill page limit
**Fix**: Use `musicdb!inner(...)` for INNER JOIN behavior

---

## Dev-Mode Assertions

Add to any component showing counts:

```typescript
if (process.env.NODE_ENV === 'development') {
  const catalogCount = musicDbCharts.length;
  const playedCount = filteredScores.length;
  const unplayedCount = noPlaySongs.length;
  
  if (catalogCount !== playedCount + unplayedCount) {
    console.error('[DATA INTEGRITY] Count mismatch!', {
      catalogCount,
      playedCount,
      unplayedCount,
      expected: catalogCount,
      actual: playedCount + unplayedCount,
    });
  }
}
```
```

---

## Part 2: Foundational Database Changes (Do NOW)

These changes are **low-risk** and **must be in place** before scaling. They're much harder to add later when data exists.

### 2.1 Add Missing Covering Index for Stats

The existing `get_user_stats` RPC joins `user_scores` with `musicdb` but there's no covering index that includes all the stats fields:

```sql
-- Covering index for stats aggregation (MFC/PFC/AAA counts)
-- This prevents full table scans when calculating user statistics
CREATE INDEX CONCURRENTLY idx_user_scores_stats_covering 
ON public.user_scores (user_id, musicdb_id, halo, rank, score);
```

**Why now**: Adding indexes on large tables takes time and can lock writes. Better to have them before data grows.

### 2.2 Add Partial Index for SP-Only Queries

Every query filters by `playstyle = 'SP'`. A partial index makes this filter essentially free:

```sql
-- Partial index for SP playstyle (excludes DP charts from index)
-- All current queries filter by SP, making this highly effective
CREATE INDEX CONCURRENTLY idx_musicdb_sp_charts 
ON public.musicdb (id, difficulty_level, deleted)
WHERE playstyle = 'SP';
```

### 2.3 Add NOT NULL Constraint to musicdb_id

Currently `musicdb_id` is nullable, but orphan scores (no chart reference) are meaningless and cause bugs:

```sql
-- First, check for any orphan scores (should be 0)
-- SELECT COUNT(*) FROM user_scores WHERE musicdb_id IS NULL;

-- Then add the constraint (only if count is 0)
ALTER TABLE public.user_scores 
ALTER COLUMN musicdb_id SET NOT NULL;
```

**Why now**: Adding NOT NULL to a large table requires checking all rows. Do it while the table is small.

### 2.4 Add Timestamp Default for New Scores

Many scores have NULL timestamps causing sorting issues. New scores should always have a timestamp:

```sql
ALTER TABLE public.user_scores 
ALTER COLUMN timestamp SET DEFAULT now();
```

**Why now**: This doesn't affect existing data but prevents future NULL timestamps.

---

## Part 3: Add Development-Mode Integrity Assertions

Add a utility function for data integrity checks:

### File: `src/lib/dataIntegrity.ts`

```typescript
/**
 * Development-mode data integrity assertions.
 * These log errors when counts don't add up, helping catch bugs early.
 */

export function assertCountIntegrity(
  context: string,
  catalogCount: number,
  playedCount: number,
  unplayedCount: number
): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const expected = catalogCount;
  const actual = playedCount + unplayedCount;
  
  if (expected !== actual) {
    console.error(
      `[DATA INTEGRITY] ${context}: Count mismatch!`,
      `\n  Catalog: ${catalogCount}`,
      `\n  Played: ${playedCount}`,
      `\n  Unplayed: ${unplayedCount}`,
      `\n  Expected: ${expected}, Actual: ${actual}`,
      `\n  Difference: ${Math.abs(expected - actual)}`
    );
  }
}

export function assertNoDuplicates<T>(
  context: string,
  items: T[],
  keyFn: (item: T) => string | number
): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const seen = new Set<string | number>();
  const duplicates: (string | number)[] = [];
  
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }
  
  if (duplicates.length > 0) {
    console.error(
      `[DATA INTEGRITY] ${context}: Found ${duplicates.length} duplicates!`,
      `\n  First 5:`, duplicates.slice(0, 5)
    );
  }
}
```

### Update Scores.tsx to use assertions

In the stats calculation section, add:

```typescript
import { assertCountIntegrity } from '@/lib/dataIntegrity';

// Inside the stats useMemo, after calculating counts:
assertCountIntegrity(
  `Scores Page (Level ${selectedLevel})`,
  musicDbChartsForLevel.length,
  playedSongs.length,
  noPlaySongs.length
);
```

---

## Part 4: Update Architecture Documentation

Add a new section to `docs/architecture-rules.md`:

```text
## 12. Data Integrity Rules

See `docs/data-integrity-checklist.md` for the complete checklist.

**Critical rules:**
1. Use `musicdb_id` ↔ `chart.id` for all matching
2. Paginated queries must have deterministic ordering
3. Use `!inner` join modifier when filtering by relations
4. Add dev-mode assertions for count invariants
```

---

## Summary of Changes

| File | Action | Risk |
|------|--------|------|
| `docs/data-integrity-checklist.md` | Create | None (docs) |
| `src/lib/dataIntegrity.ts` | Create | None (dev-only utils) |
| `src/pages/Scores.tsx` | Add assertion | Low (dev-only logging) |
| `docs/architecture-rules.md` | Add section 12 | None (docs) |
| Database migration | Add indexes + constraints | Low (CONCURRENTLY) |

---

## Migration Execution Plan

```sql
-- Migration: 001_prescale_foundation.sql

-- 1. Add covering index for stats (CONCURRENTLY = no table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_scores_stats_covering 
ON public.user_scores (user_id, musicdb_id, halo, rank, score);

-- 2. Add partial index for SP charts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_musicdb_sp_charts 
ON public.musicdb (id, difficulty_level, deleted)
WHERE playstyle = 'SP';

-- 3. Add default timestamp for new scores
ALTER TABLE public.user_scores 
ALTER COLUMN timestamp SET DEFAULT now();

-- 4. Verify no orphan scores before adding NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_scores WHERE musicdb_id IS NULL LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot add NOT NULL: orphan scores exist';
  END IF;
END $$;

-- 5. Add NOT NULL constraint (safe after verification)
ALTER TABLE public.user_scores 
ALTER COLUMN musicdb_id SET NOT NULL;
```

---

## Why These Changes Are Safe Now

| Change | Risk if done now | Risk if done at scale |
|--------|------------------|----------------------|
| Documentation | None | None |
| Dev assertions | None (dev-only) | None |
| Indexes (CONCURRENTLY) | <1 second | Minutes, potential timeouts |
| NOT NULL constraint | Instant (small table) | Requires full table scan |
| Default timestamp | Instant | Instant |

**Recommendation**: Execute all database changes before reaching 10,000 rows in user_scores.

