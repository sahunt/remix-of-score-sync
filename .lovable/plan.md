

# Fix Data Integrity: Replace Composite Key with ID-Based Matching

## Problem Summary

**Scores.tsx is using a buggy composite key approach that causes incorrect counts:**
- Level 14 shows: Total 234, No Play 37 (should be Total 248, No Play 5)
- Level 11 shows: Total 372, No Play 44 (should be Total 381, No Play 1)

The database confirms:
- Level 14: 253 catalog charts, 248 unique played, 5 unplayed
- Level 11: 382 catalog charts, 381 unique played, 1 unplayed

## Root Cause

Lines 211-219 in Scores.tsx use unreliable string-based composite keys:
```typescript
// CURRENT BUGGY CODE
const playedChartKeys = new Set(
  playedSongs.map(s => `${s.song_id}|${s.difficulty_name}`)
);
noPlaySongs = musicDbChartsForLevel
  .filter(chart => !playedChartKeys.has(`${chart.song_id}|${chart.difficulty_name}`))
```

This fails because `song_id` or `difficulty_name` can be null/inconsistent, causing played songs to not match their catalog entry.

## Solution

Replace with ID-based matching (same approach that works correctly in GoalDetail.tsx):

```typescript
// FIXED CODE - Use database foreign key
const playedMusicDbIds = new Set(
  filteredScores.map(s => s.musicdb_id).filter((id): id is number => id != null)
);
noPlaySongs = musicDbChartsForLevel
  .filter(chart => !playedMusicDbIds.has(chart.id))
```

## Changes Required

**File: `src/pages/Scores.tsx`**

### Change 1: Build ID-based set from filteredScores

Replace lines 210-213 (the composite key set creation) with:
```typescript
// Build set of played chart IDs (musicdb primary keys)
const playedMusicDbIds = new Set(
  filteredScores.map(s => s.musicdb_id).filter((id): id is number => id != null)
);
```

### Change 2: Filter using chart.id instead of composite key

Replace line 219 (the filter logic) with:
```typescript
.filter(chart => !playedMusicDbIds.has(chart.id))
```

### Change 3: Fix Total stat calculation

The `Total` stat (line 313) should use `filteredScores.length` directly instead of calculating from `playedSongs` after converting to DisplaySong format. This ensures consistency.

## Verification

After fix:
- Level 14: Total 248, No Play 5 (matches database)
- Level 11: Total 381, No Play 1 (matches database)
- Math check: catalog_count = Total + No_Play (must always be true)

## Technical Details

### Why ID-Based Matching Works

1. **musicdb_id** on user_scores is a foreign key to musicdb.id
2. **chart.id** is the primary key of musicdb
3. These are database-enforced, never null, always consistent

### Why Composite Keys Fail

1. `song_id` might be null if musicdb relation didn't load properly
2. `difficulty_name` case sensitivity issues (EXPERT vs expert)
3. String concatenation creates false negatives when any part is null

### Code Location Reference

| Location | Current (Buggy) | Fixed |
|----------|-----------------|-------|
| Line 211-213 | `${s.song_id}\|${s.difficulty_name}` | `s.musicdb_id` |
| Line 219 | `playedChartKeys.has(...)` | `playedMusicDbIds.has(chart.id)` |

