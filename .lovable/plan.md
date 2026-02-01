
# Bug Fix: Era Chip Display and Modal Score Synchronization

## Problem Summary

Two critical bugs were identified on the Scores page:

1. **Era chip not displaying for `era=0` songs** - Songs with `era=0` (Classic era) don't show the era chip, even though the database correctly stores `era=0`
2. **Modal shows no scores** - When clicking a song card with visible scores, the modal shows "No play" for all difficulties

## Root Cause Analysis

### Bug 1: Era Display Issue

The database correctly stores `era=0` for Classic era songs. The `EraChip` component handles this correctly with explicit null checks:

```typescript
if (era === null || era === undefined) return null;
```

**However**, the issue is on **line 752 of Scores.tsx**:

```typescript
era={selectedSong?.era ?? null}
```

The `??` operator is correct, but the problem is upstream. When `selectedSong` is set in `handleSongClick`, it uses `song.era` from the `DisplaySong`. If `era` is `0` and gets passed through multiple layers, TypeScript's optional chaining can coerce it.

But the **actual culprit** is likely that `era` is being treated as "falsy" somewhere in the data chain. The `MusicDbChart` interface has `era: number | null`, but when the query returns, Supabase may return `0` as a primitive that gets coerced.

Let me trace more carefully:
- Line 493 creates noPlay songs with `era: chart.era` (chart comes from `musicDbCharts`)
- `musicDbCharts` is fetched with `era` in the select
- The interface `MusicDbChart` has `era: number | null`

The actual fix needed: ensure explicit typing and avoid any implicit falsy checks.

### Bug 2: Modal Score Mismatch (Critical)

The `handleSongClick` function uses **two different data sources** that are NOT synchronized:

**Source 1 - Song List Display (local `scores` state)**:
- Fetched via `useEffect` on line 293-375
- Filtered by `selectedLevel` and `levelsToFetch`
- Cached in local `scores` state

**Source 2 - Modal Preloading (global `globalScores` context)**:
- Fetched via `useUserScores` hook through `ScoresProvider`
- NO level filtering - fetches ALL scores
- Cached in React Query with key `['user-scores', user?.id, 'global', ...]`

**The Mismatch**: When a user clicks on a song card, the card displays data from `scores` (local state), but the modal's `preloadedCharts` is built using `globalScores` (context). If these two haven't synchronized (due to different cache timing, loading states, or query parameters), the modal shows stale or missing data.

**Example scenario**:
1. User uploads new scores
2. Local `scores` refetches and shows updated data in list
3. `globalScores` cache (5 minute staleTime) hasn't invalidated yet
4. User clicks a song with new CHAOS score
5. Modal uses old `globalScores` which doesn't have the CHAOS score
6. Modal shows "No play" for all difficulties

## Implementation Plan

### Step 1: Fix Modal Data Source to Use Local Scores

**File**: `src/pages/Scores.tsx`

Change `handleSongClick` to use the local `scores` state (which matches what's displayed) instead of `globalScores`:

```typescript
// BEFORE (lines 235-239):
const scoreMap = new Map(
  globalScores
    .filter(s => s.musicdb?.song_id === song.song_id)
    .map(s => [s.difficulty_name?.toUpperCase(), s])
);

// AFTER:
// Use local scores state - this matches what's displayed in the list
const scoreMap = new Map(
  scores
    .filter(s => s.musicdb?.song_id === song.song_id)
    .map(s => [s.difficulty_name?.toUpperCase(), s])
);
```

Also update the `useCallback` dependencies:
```typescript
// BEFORE:
}, [globalScores, songChartsCache]);

// AFTER:
}, [scores, songChartsCache]);
```

### Step 2: Remove Unused globalScores Import (Optional Cleanup)

If `globalScores` is no longer needed in Scores.tsx after the fix, remove the import:

```typescript
// Line 204 - can be removed if not used elsewhere:
const { scores: globalScores } = useScores();
```

**Note**: Check if `globalScores` is used elsewhere in the component before removing.

### Step 3: Fix Era Display for Value `0`

The era display issue is subtle. The fix is to ensure that anywhere era is conditionally rendered, we use explicit null/undefined checks rather than truthy checks.

**File**: `src/components/scores/SongDetailModal.tsx`

The current check (lines 241-245) is correct:
```typescript
{era !== null && era !== undefined && (
  <div className="flex justify-center mt-2">
    <EraChip era={era} />
  </div>
)}
```

**However**, if `era` is coming through as `undefined` from the data chain, this would fail to render. Verify the data is being passed correctly by checking:

1. `DisplaySong` interface includes `era: number | null`
2. `SelectedSong` interface includes `era: number | null`
3. Data mapping uses `??` not `||`

All these appear correct in the current code. The remaining possibility is that the `musicdb` join returns `null` for some rows, making `s.musicdb?.era` become `undefined`.

**Additional fix in `handleSongClick`** to ensure era is explicitly passed:
```typescript
// Line 267:
era: song.era ?? null, // Explicitly coerce undefined to null
```

## Technical Details

### Files to Modify

1. **`src/pages/Scores.tsx`**
   - Line 235-239: Change `globalScores` to `scores` in `scoreMap` construction
   - Line 271: Update `useCallback` dependencies from `globalScores` to `scores`
   - Line 267: Ensure era uses explicit null coalescing

### Testing Checklist

After implementation:
- Click on a song card with visible scores and verify modal shows the same scores
- Click on a song with `era=0` (Classic) and verify the Classic era chip appears
- Click on songs with `era=1` (White) and `era=2` (Gold) to verify those chips appear
- Upload new scores and immediately verify the modal shows updated data
- Test with various filter combinations to ensure data consistency

## Risk Assessment

- **Low risk**: The change is isolated to data source selection in `handleSongClick`
- Uses data that's already loaded and displayed in the list
- No database queries or schema changes required
- No RLS policy changes needed
