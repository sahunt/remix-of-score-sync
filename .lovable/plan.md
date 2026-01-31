

# Fix Song Detail Modal Flicker - Use Global Scores Cache

## Problem Analysis

The current implementation causes a flicker because:

1. **Partial data first**: `prepareChartsForModal` uses level-filtered data from Scores page state
2. **Complete data second**: Modal fetches all 5 difficulties, causing a re-render
3. **Visual flicker**: User sees 1-2 rows → then all 5 rows appear

The Scores page fetches level-filtered data (`scores` state), but the modal needs ALL difficulties for a song.

## Solution: Use Global Scores Context

The `ScoresProvider` already caches ALL user scores across all levels. By using this global cache instead of the level-filtered local state, we can instantly populate the modal with all played difficulties.

**Key insight**: The global `useScores()` hook contains every score the user has played. We just need to filter it by `song_id` to get all played difficulties instantly.

## Implementation

### 1. Import Global Scores in Scores.tsx

```typescript
import { useScores } from '@/contexts/ScoresContext';
```

### 2. Get Global Scores Reference

```typescript
// Inside Scores component
const { scores: globalScores } = useScores();
```

### 3. Update prepareChartsForModal to Use Global Scores

Pass `globalScores` instead of the level-filtered `scores`:

```typescript
function prepareChartsForModal(
  songId: number,
  globalScores: ScoreWithSong[], // Use global scores (all levels)
  musicDbCharts: MusicDbChart[]
): PreloadedChart[] {
  // Get ALL user's scores for this song from global cache
  const scoresForSong = globalScores.filter(s => s.musicdb?.song_id === songId);
  // ... rest of logic unchanged
}
```

### 4. Update handleSongClick to Use Global Scores

```typescript
const handleSongClick = useCallback((song: DisplaySong) => {
  if (!song.song_id) return;
  
  // Use globalScores (all levels) instead of local scores (level-filtered)
  const chartsForSong = prepareChartsForModal(song.song_id, globalScores, musicDbCharts);
  
  setSelectedSong({
    songId: song.song_id,
    songName: song.name ?? 'Unknown Song',
    artist: song.artist,
    eamuseId: song.eamuse_id,
    preloadedCharts: chartsForSong,
  });
  setIsDetailModalOpen(true);
}, [globalScores, musicDbCharts]); // Updated dependency
```

### 5. Modal Only Fetches Missing Unplayed Data (No Flicker)

Update modal logic to ONLY fetch if the preloaded data is insufficient, and NOT update existing rows:

```typescript
// In SongDetailModal.tsx
useEffect(() => {
  if (!isOpen || !songId) {
    setCharts([]);
    setLoading(false);
    return;
  }

  const hasPreloadedData = preloadedCharts && preloadedCharts.length > 0;
  
  if (hasPreloadedData) {
    // Show preloaded data immediately
    setCharts(preloadedCharts);
    setLoading(false);
    
    // If we already have 5 difficulties, we're complete - no fetch needed
    if (preloadedCharts.length >= 5) {
      return;
    }
    
    // Otherwise, fetch missing unplayed difficulties in background
    // BUT: merge them without replacing existing data to avoid flicker
  }
  
  // Fetch complete data...
  // When merging, preserve preloaded scores, only add NEW unplayed difficulties
}, [isOpen, songId, preloadedCharts, user]);
```

The key change in the modal is: when fetching complete data, **merge rather than replace** - only add difficulties that aren't already in the preloaded data.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Scores.tsx` | Import `useScores`, use `globalScores` in `prepareChartsForModal` |
| `src/components/scores/SongDetailModal.tsx` | Merge fetched data with preloaded, don't replace |

## Expected Outcome

- **Instant display**: All played difficulties appear immediately (from global cache)
- **No flicker**: Existing rows never change, only new unplayed rows are added
- **Complete data**: After background fetch, all 5 difficulties are shown
- **Smooth UX**: If user has played 3 difficulties, those appear instantly; remaining 2 fade in

## Edge Cases

| Case | Behavior |
|------|----------|
| User has played all 5 difficulties | Instant complete display, no fetch |
| User has played 0 difficulties | Brief fetch, then all 5 appear (unavoidable) |
| User has played 2 difficulties | 2 appear instantly, 3 more added smoothly |

