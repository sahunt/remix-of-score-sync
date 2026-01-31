
# Fix Song Detail Modal - Show All 5 Difficulties Instantly

## Problem

The modal currently shows only difficulties that have been played (from `globalScores`) plus unplayed difficulties at the currently selected level (from `musicDbCharts`). Missing difficulties at other levels cause flickering when the modal later fetches them.

**Example:**
- User viewing level 17
- Clicks a song where they've played EXPERT (17) and CHALLENGE (19)
- Modal shows: EXPERT ✓, CHALLENGE ✓
- Missing: BASIC (level 5), DIFFICULT (level 10), BEGINNER (level 3)

## Solution: Pre-Cache All Song Charts

Create a song-to-charts lookup that contains ALL SP difficulties for ALL songs. This data comes from `musicdb` and doesn't change often, so we can fetch it once and cache it.

---

## Implementation

### 1. Add a Song Charts Cache Hook

Create a new hook that fetches and caches all SP charts grouped by song_id:

```typescript
// src/hooks/useSongChartsCache.ts
export function useSongChartsCache() {
  return useQuery({
    queryKey: ['all-song-charts'],
    queryFn: async () => {
      // Fetch ALL SP charts from musicdb (grouped by song)
      const { data, error } = await supabase
        .from('musicdb')
        .select('id, song_id, difficulty_name, difficulty_level')
        .eq('playstyle', 'SP')
        .eq('deleted', false)
        .not('difficulty_level', 'is', null);
      
      if (error) throw error;
      
      // Build a Map: song_id -> chart[]
      const chartsBySong = new Map<number, ChartInfo[]>();
      for (const chart of data ?? []) {
        if (!chartsBySong.has(chart.song_id)) {
          chartsBySong.set(chart.song_id, []);
        }
        chartsBySong.get(chart.song_id)!.push({
          id: chart.id,
          difficulty_name: chart.difficulty_name,
          difficulty_level: chart.difficulty_level,
        });
      }
      return chartsBySong;
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
    gcTime: 60 * 60 * 1000,    // 1 hour
  });
}
```

### 2. Use the Cache in Scores.tsx

```typescript
// In Scores component
const { data: songChartsCache } = useSongChartsCache();

// Update prepareChartsForModal to use the complete cache
const handleSongClick = useCallback((song: DisplaySong) => {
  if (!song.song_id) return;
  
  // Get ALL charts for this song from the cache
  const allChartsForSong = songChartsCache?.get(song.song_id) ?? [];
  
  // Build score lookup from global scores
  const scoreMap = new Map(
    globalScores
      .filter(s => s.musicdb?.song_id === song.song_id)
      .map(s => [s.difficulty_name?.toUpperCase(), s])
  );
  
  // Merge: all charts + user scores
  const preloadedCharts = allChartsForSong
    .map(chart => ({
      id: chart.id,
      difficulty_name: chart.difficulty_name?.toUpperCase() ?? 'UNKNOWN',
      difficulty_level: chart.difficulty_level ?? 0,
      score: scoreMap.get(chart.difficulty_name?.toUpperCase())?.score ?? null,
      rank: scoreMap.get(chart.difficulty_name?.toUpperCase())?.rank ?? null,
      flare: scoreMap.get(chart.difficulty_name?.toUpperCase())?.flare ?? null,
      halo: scoreMap.get(chart.difficulty_name?.toUpperCase())?.halo ?? null,
      source_type: null,
    }))
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty_name) - DIFFICULTY_ORDER.indexOf(b.difficulty_name));
  
  setSelectedSong({
    songId: song.song_id,
    songName: song.name ?? 'Unknown Song',
    artist: song.artist,
    eamuseId: song.eamuse_id,
    preloadedCharts, // Now contains ALL 5 difficulties
  });
  setIsDetailModalOpen(true);
}, [globalScores, songChartsCache]);
```

### 3. Modal Uses Preloaded Data Only

The modal already has the correct logic to use preloaded data directly:

```typescript
// Already in SongDetailModal.tsx
if (hasPreloadedData) {
  setCharts(preloadedCharts);
  setLoading(false);
  return; // DONE - all 5 difficulties already provided
}
```

---

## Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `src/hooks/useSongChartsCache.ts` | CREATE | New hook that caches all song charts |
| `src/pages/Scores.tsx` | MODIFY | Import and use the cache, update `prepareChartsForModal` |

---

## Data Flow

```text
User clicks song card
        ↓
┌───────────────────────────────────────────────────┐
│ songChartsCache.get(song_id)                      │
│   → Returns ALL 5 SP difficulties for this song   │
└───────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────┐
│ globalScores.filter(song_id)                      │
│   → Returns user's scores for played difficulties │
└───────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────┐
│ Merge: All charts + User scores                   │
│   → 5 rows with score data or null (No play)      │
└───────────────────────────────────────────────────┘
        ↓
Modal opens with complete data (no fetch, no flicker)
```

---

## Expected Outcome

- **All 5 difficulties visible instantly** - BEGINNER through CHALLENGE
- **No loading spinner** - data is already available from cache
- **No flicker** - no background fetches that trigger re-renders
- **Played difficulties show scores** - from global scores cache
- **Unplayed difficulties show "No play"** - from song charts cache

---

## Technical Notes

- The `musicdb` table has ~10,000 charts, but the query only fetches 4 small fields (id, song_id, difficulty_name, difficulty_level)
- With 30-minute cache, this single fetch serves all modal opens without repeated queries
- The hook is placed at the Scores page level, so it loads when the page loads (not when clicking)
