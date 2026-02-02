

# Cache Audit: Data Propagation Issues and Fixes

## Current Cache Architecture

The app has three main caches for chart/song data:

| Cache | Purpose | Fields Fetched |
|-------|---------|----------------|
| `useAllChartsCache` | Flat array for filtering/search | id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized |
| `useSongChartsCache` | Map by song_id for modal | id, song_id, difficulty_name, difficulty_level |
| `useScores` (ScoresContext) | User's played scores | All fields via `useUserScores` |

---

## Issues Found

### Issue 1: Missing `era` in `useAllChartsCache`

**Location**: `src/hooks/useAllChartsCache.ts`

The `FullChartInfo` interface and query are missing the `era` field. This causes:
- "No play" songs on the Scores page to show `era: null`
- Goal Detail unplayed charts to have no era data
- Home page search results to lack era data for modal display

**Current select:**
```typescript
.select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized')
```

**Missing:** `era`

### Issue 2: "No Play" Songs Missing `name_romanized` and `era`

**Location**: `src/pages/Scores.tsx` (lines 220-238)

When building "no play" songs from `musicDbChartsForLevel`, the code explicitly sets:
```typescript
name_romanized: null, // Not in cache
era: null, // Not in cache
```

This is because `useAllChartsCache` didn't have these fields. With `name_romanized` now added and `era` to be added, these can be properly propagated.

### Issue 3: `useSongChartsCache` Too Minimal for Modal

**Location**: `src/hooks/useSongChartsCache.ts`

This cache only fetches `id, song_id, difficulty_name, difficulty_level`. While this is intentional (it's used only for modal chart enumeration), the modal preloading logic in `Home.tsx`, `Scores.tsx`, and `GoalDetail.tsx` sets:
```typescript
source_type: null,
```

This is acceptable because `source_type` comes from user scores, not musicdb.

### Issue 4: Goal Detail Unplayed Charts Missing `era`

**Location**: `src/pages/GoalDetail.tsx` (lines 98-117)

Unplayed charts built from `useAllChartsCache` lack `era` because it's not in the cache.

---

## Solution

### Step 1: Add `era` to `useAllChartsCache`

Update the interface and query to include `era`:

**File**: `src/hooks/useAllChartsCache.ts`

```typescript
export interface FullChartInfo extends ChartInfo {
  id: number;
  song_id: number;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
  name_romanized: string | null;
  era: number | null;  // ADD THIS
}

// Update the select query:
.select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized, era')
```

### Step 2: Propagate `era` and `name_romanized` in Scores Page

Update "no play" songs to use cached values:

**File**: `src/pages/Scores.tsx`

```typescript
// Line 220-238: Update noPlaySongs mapping
noPlaySongs = musicDbChartsForLevel
  .filter(chart => !playedChartKeys.has(`${chart.song_id}|${chart.difficulty_name}`))
  .map(chart => ({
    id: `noplay-${chart.id}`,
    score: null,
    rank: null,
    flare: null,
    halo: null,
    difficulty_level: chart.difficulty_level,
    difficulty_name: chart.difficulty_name,
    name: chart.name,
    artist: chart.artist,
    eamuse_id: chart.eamuse_id,
    song_id: chart.song_id,
    name_romanized: chart.name_romanized,  // Now available
    era: chart.era,                        // Now available
    isNoPlay: true,
  }));
```

### Step 3: Propagate `era` in Goal Detail

Update unplayed charts to include era:

**File**: `src/pages/GoalDetail.tsx`

```typescript
// Line 98-117: Add era to unplayed chart mapping
const unplayedCharts: ScoreWithSong[] = useMemo(() => 
  matchingCharts
    .filter(chart => !playedChartIds.has(chart.id))
    .map(chart => ({
      id: `unplayed-${chart.id}`,
      score: null,
      rank: null,
      flare: null,
      halo: null,
      difficulty_level: chart.difficulty_level,
      difficulty_name: chart.difficulty_name,
      playstyle: chart.playstyle,
      name: chart.name,
      artist: chart.artist,
      eamuse_id: chart.eamuse_id,
      song_id: chart.song_id,
      era: chart.era,  // ADD THIS
      isUnplayed: true,
    })),
  [matchingCharts, playedChartIds]
);
```

### Step 4: Update `SongSearchResult` to include era (Home page)

Update the search result type to pass era to modal:

**File**: `src/hooks/useSongCatalogSearch.ts`

```typescript
export interface SongSearchResult {
  songId: number;
  name: string;
  artist: string | null;
  eamuseId: string | null;
  era: number | null;  // ADD THIS
}

// Update the mapping:
songMap.set(chart.song_id, {
  songId: chart.song_id,
  name: chart.name ?? 'Unknown Song',
  artist: chart.artist,
  eamuseId: chart.eamuse_id,
  era: chart.era,  // ADD THIS
});
```

### Step 5: Update Home.tsx to pass era

**File**: `src/pages/Home.tsx`

```typescript
// Update handleSongClick and SongSearchCard to pass era
<SongSearchCard
  key={song.songId}
  songId={song.songId}
  name={song.name}
  artist={song.artist}
  eamuseId={song.eamuseId}
  onClick={() => handleSongClick(song)}
/>

// In handleSongClick, update selectedSong:
setSelectedSong({
  songId: song.songId,
  songName: song.name,
  artist: song.artist,
  eamuseId: song.eamuseId,
  era: song.era,  // Use from search result instead of null
  preloadedCharts,
});
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAllChartsCache.ts` | Add `era` to interface and query |
| `src/hooks/useSongCatalogSearch.ts` | Add `era` to `SongSearchResult` and mapping |
| `src/pages/Scores.tsx` | Use cached `name_romanized` and `era` for "no play" songs |
| `src/pages/GoalDetail.tsx` | Add `era` to unplayed chart mapping |
| `src/pages/Home.tsx` | Pass `era` from search result to modal |

---

## Impact

After these changes:
- **Search**: All song results will have full metadata including `era` for modal display
- **"No play" songs**: Will have proper `name_romanized` (for search) and `era` (for display)
- **Goal Detail**: Unplayed charts will show era chips in modals
- **Consistency**: All data paths will have the same fields, eliminating "unrepresented data" issues

