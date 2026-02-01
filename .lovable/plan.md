
# Fix Song Detail Modal: Data Reliability and Synchronization

## Problem Summary

The Song Detail Modal shows "No SP charts available" for songs that clearly have scores in the list, and source icons (sanbai/phaseii) are not displaying.

## Root Cause Analysis

I traced the entire data flow and found **THREE critical bugs** creating this unreliable behavior:

### Bug 1: Deleted Songs Not Filtered in Scores.tsx

The local `scores` fetch in `Scores.tsx` (lines 306-328) does NOT filter out deleted songs from the `musicdb` table. Meanwhile, the `useSongChartsCache` hook DOES filter deleted songs (line 33: `.eq('deleted', false)`).

**Result**: Songs like "CARTOON HEROES (20th Anniversary Mix)" appear in the song list (because their user_scores still exist), but when clicked, the modal gets **zero charts** from the cache because the charts are marked `deleted: true`.

**Evidence from database**:
```
CARTOON HEROES (20th Anniversary Mix) - song_id 38897
- All 5 SP charts have deleted: true
- User has 72 scores linked to deleted songs
```

### Bug 2: source_type Field Missing from Query

The local scores fetch in `Scores.tsx` does NOT include `source_type` in its SELECT statement:
```typescript
.select(`
  id, score, timestamp, playstyle,
  difficulty_name, difficulty_level, rank, flare, halo,
  musicdb (...) 
`) // NO source_type!
```

And worse, the preloading logic hardcodes `source_type: null`:
```typescript
source_type: null,  // Line 254 - should be: source_type: userScore?.source_type ?? null
```

### Bug 3: ScoreWithSong Interface Missing source_type

The `ScoreWithSong` interface in Scores.tsx (lines 21-39) doesn't include the `source_type` field, so even if we fetched it, TypeScript wouldn't recognize it.

## The Elegant Solution: Unify Data Sources

The core problem is **data fragmentation**. There are currently 3+ sources of score data:
1. Global context (`ScoresProvider` / `useScores`)  
2. Local state (`scores` in Scores.tsx)
3. `useSongChartsCache` for chart metadata

Instead of patching each individually, the fix should:

1. **Add `deleted` field to local query** so deleted songs are filtered consistently
2. **Add `source_type` to interface and query** so source icons display
3. **Use local scores directly for modal** (keeping the recent fix that switched from globalScores to local scores)
4. **Handle edge case when cache is empty** by falling back to modal's internal fetch

## Implementation Plan

### Step 1: Update ScoreWithSong Interface
**File**: `src/pages/Scores.tsx` (lines 21-39)

Add `source_type` field to the interface:
```typescript
interface ScoreWithSong {
  id: string;
  score: number | null;
  // ... existing fields
  halo: string | null;
  source_type: string | null;  // ADD THIS
  musicdb: {
    // ... existing fields
    deleted?: boolean | null;  // ADD THIS for filtering
  } | null;
}
```

### Step 2: Update Supabase Query
**File**: `src/pages/Scores.tsx` (lines 306-328)

Add `source_type` to the select and `deleted` to the musicdb join:
```typescript
.select(`
  id,
  score,
  timestamp,
  playstyle,
  difficulty_name,
  difficulty_level,
  rank,
  flare,
  halo,
  source_type,
  musicdb (
    name,
    artist,
    eamuse_id,
    song_id,
    name_romanized,
    era,
    deleted
  )
`)
```

### Step 3: Filter Out Deleted Songs
**File**: `src/pages/Scores.tsx` (after the fetch, ~line 366)

Filter deleted songs client-side to match the shared hook behavior:
```typescript
// Filter out scores for deleted songs (matches useUserScores behavior)
const validScores = sortedData.filter(s => 
  s.musicdb !== null && s.musicdb.deleted !== true
);
setScores(validScores);
```

### Step 4: Pass source_type to Preloaded Charts
**File**: `src/pages/Scores.tsx` (line 254)

Fix the hardcoded null:
```typescript
return {
  id: chart.id,
  difficulty_name: chart.difficulty_name,
  difficulty_level: chart.difficulty_level,
  score: userScore?.score ?? null,
  rank: userScore?.rank ?? null,
  flare: userScore?.flare ?? null,
  halo: userScore?.halo ?? null,
  source_type: userScore?.source_type ?? null,  // FIX: was hardcoded null
};
```

### Step 5: Handle Empty Cache Gracefully
**File**: `src/pages/Scores.tsx` (in handleSongClick, around line 232)

When `songChartsCache` returns empty (e.g., for deleted songs that somehow got scores), let the modal's internal fetch handle it instead of passing empty preloaded data:
```typescript
const handleSongClick = useCallback((song: DisplaySong) => {
  if (!song.song_id) return;
  
  const allChartsForSong = songChartsCache?.get(song.song_id) ?? [];
  
  let preloadedCharts: PreloadedChart[] | undefined;
  
  // Only preload if we have charts from the cache
  // Otherwise let modal fetch directly (handles edge cases like deleted songs)
  if (allChartsForSong.length > 0) {
    const scoreMap = new Map(
      scores
        .filter(s => s.musicdb?.song_id === song.song_id)
        .map(s => [s.difficulty_name?.toUpperCase(), s])
    );
    
    preloadedCharts = allChartsForSong.map(chart => {
      const userScore = scoreMap.get(chart.difficulty_name);
      return {
        id: chart.id,
        difficulty_name: chart.difficulty_name,
        difficulty_level: chart.difficulty_level,
        score: userScore?.score ?? null,
        rank: userScore?.rank ?? null,
        flare: userScore?.flare ?? null,
        halo: userScore?.halo ?? null,
        source_type: userScore?.source_type ?? null,
      };
    }).sort((a, b) => {
      const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty_name);
      const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty_name);
      return aIndex - bIndex;
    });
  }
  
  setSelectedSong({
    songId: song.song_id,
    songName: song.name ?? 'Unknown Song',
    artist: song.artist,
    eamuseId: song.eamuse_id,
    era: song.era ?? null,
    preloadedCharts,  // undefined triggers modal fetch
  });
  setIsDetailModalOpen(true);
}, [scores, songChartsCache]);
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Scores.tsx` | Add `source_type` to interface |
| `src/pages/Scores.tsx` | Add `source_type` and `deleted` to query |
| `src/pages/Scores.tsx` | Filter deleted songs from results |
| `src/pages/Scores.tsx` | Pass `source_type` to preloaded charts |
| `src/pages/Scores.tsx` | Handle empty cache gracefully |

## Why This Approach?

**Simplicity**: Rather than adding more caching layers or complex synchronization, this fix:
- Aligns the local fetch with the shared hook's behavior (filtering deleted songs)
- Adds the missing field that was always meant to be there
- Gracefully handles edge cases without breaking the modal's fallback mechanism

**Reliability**: After this fix:
- Deleted songs won't appear in the list (consistent with Goals page)
- Source icons (sanbai/phaseii) will display in the modal
- Modal will never show "No SP charts" for songs that have scores

## Testing Checklist

1. Songs with `deleted: true` should NOT appear in the Scores list
2. Clicking any song should show all difficulties with correct scores
3. Source icons (sanbai/phaseii) should appear next to scores in the modal
4. Era chips should display for all songs (including era=0 Classic)
5. Modal should work even if songChartsCache hasn't loaded yet
