
# Performance Improvements for Song Cards

## Overview

The flicker occurs primarily in the **SongDetailModal** when clicking a song card. The modal currently makes fresh database calls on every open, despite the data already being available in the parent component's state.

## Root Cause Analysis

| Issue | Location | Impact |
|-------|----------|--------|
| Fresh API calls on every modal open | `SongDetailModal.tsx` lines 114-176 | Loading spinner appears, causes flicker |
| No caching for modal data | `SongDetailModal.tsx` uses `useState` not React Query | Each open = fresh fetch |
| Image state reset on song change | `SongDetailModal.tsx` line 102-105 | Placeholder → image flash |

## Solution: Pass Available Data to Modal

Since the Scores page already has:
- All user scores for the current level (`scores` state)
- All musicdb charts for the level (`musicDbCharts` state)

We can derive the modal's data from what's already loaded, eliminating the need for additional API calls.

---

## Implementation

### 1. Extend Modal Props to Accept Pre-Loaded Data

**Current Modal Props:**
```typescript
interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number | null;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
}
```

**New Modal Props:**
```typescript
interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number | null;
  songName: string;
  artist: string | null;
  eamuseId: string | null;
  // Pre-loaded data to avoid additional API calls
  preloadedCharts?: ChartWithScore[];
}
```

### 2. Prepare Modal Data in Parent (Scores.tsx)

When a song is clicked, collect all difficulties for that song from the existing data:

```typescript
const handleSongClick = useCallback((song: DisplaySong) => {
  if (!song.song_id) return;
  
  // Collect all charts for this song from already-loaded data
  const chartsForSong = prepareChartsForModal(song.song_id, scores, musicDbCharts);
  
  setSelectedSong({
    songId: song.song_id,
    songName: song.name ?? 'Unknown Song',
    artist: song.artist,
    eamuseId: song.eamuse_id,
    preloadedCharts: chartsForSong,
  });
  setIsDetailModalOpen(true);
}, [scores, musicDbCharts]);
```

### 3. Use Preloaded Data First, Fetch as Fallback

In `SongDetailModal`, use preloaded data when available:

```typescript
useEffect(() => {
  if (!isOpen || !songId || !user) {
    setCharts([]);
    return;
  }

  // If preloaded data provided, use it immediately
  if (preloadedCharts && preloadedCharts.length > 0) {
    setCharts(preloadedCharts);
    setLoading(false);
    return;
  }

  // Fallback: fetch if no preloaded data (e.g., deep link to modal)
  // ... existing fetch logic ...
}, [isOpen, songId, user, preloadedCharts]);
```

---

## Additional Optimizations

### 4. Memoize Chart Data Preparation

Create a utility function to prepare modal data from existing state:

```typescript
function prepareChartsForModal(
  songId: number,
  scores: ScoreWithSong[],
  musicDbCharts: MusicDbChart[]
): ChartWithScore[] {
  // Get all charts for this song
  const chartsForSong = musicDbCharts.filter(c => c.song_id === songId);
  
  // Build score map for O(1) lookup
  const scoreMap = new Map(
    scores
      .filter(s => s.musicdb?.song_id === songId)
      .map(s => [s.difficulty_name?.toUpperCase(), s])
  );
  
  // Merge and sort by difficulty order
  return chartsForSong
    .map(chart => ({
      id: chart.id,
      difficulty_name: chart.difficulty_name ?? 'UNKNOWN',
      difficulty_level: chart.difficulty_level ?? 0,
      score: scoreMap.get(chart.difficulty_name?.toUpperCase())?.score ?? null,
      rank: scoreMap.get(chart.difficulty_name?.toUpperCase())?.rank ?? null,
      flare: scoreMap.get(chart.difficulty_name?.toUpperCase())?.flare ?? null,
      halo: scoreMap.get(chart.difficulty_name?.toUpperCase())?.halo ?? null,
      source_type: null, // Not in current data, could be added
    }))
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty_name) - DIFFICULTY_ORDER.indexOf(b.difficulty_name));
}
```

### 5. Optional: React Query for Modal with Caching

For cases where modal is opened without parent data (e.g., direct link), wrap the modal's data fetch in React Query:

```typescript
const { data: fetchedCharts, isLoading } = useQuery({
  queryKey: ['song-charts', songId, user?.id],
  queryFn: () => fetchChartDataForSong(songId, user.id),
  enabled: isOpen && !!songId && !preloadedCharts?.length,
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/scores/SongDetailModal.tsx` | Accept optional `preloadedCharts` prop, use when available |
| `src/pages/Scores.tsx` | Prepare chart data from existing state when clicking a song |
| `src/pages/Scores.tsx` | Update `SelectedSong` interface to include preloaded charts |

---

## Expected Outcome

- **No loading spinner** when opening modal (data already available)
- **Instant modal population** - charts appear immediately
- **Reduced API calls** - 2 fewer requests per modal open
- **Fallback preserved** - still works if opened without parent context

## Limitations

This solution covers the most common case (clicking from Scores page). If the modal is opened from a different context without preloaded data (e.g., future deep link feature), it will still fetch from the API as a fallback.
