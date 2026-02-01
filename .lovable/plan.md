
# Plan: Enable Song Detail Modal on Goal Detail Page

## Overview
Make song cards clickable on the Goal Detail page to open the same `SongDetailModal` used on the Scores page. No new components needed - we'll reuse the existing modal and add the click handling plumbing.

---

## Changes Required

### 1. GoalDetail.tsx - Add Modal State and Handler
Add the same modal pattern used in Scores.tsx:

```typescript
// Add imports
import { SongDetailModal } from '@/components/scores/SongDetailModal';
import { useSongChartsCache } from '@/hooks/useSongChartsCache';
import type { PreloadedChart } from '@/types/scores';

// Add state for selected song and modal visibility
const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

// Add song charts cache for preloading modal data
const { data: songChartsCache } = useSongChartsCache();

// Add click handler (mirrors Scores.tsx handleSongClick)
const handleSongClick = useCallback((song: ScoreWithSong) => {
  const songId = song.musicdb?.song_id ?? song.song_id;
  if (!songId) return;
  
  // Get charts from cache and merge with user scores
  const allChartsForSong = songChartsCache?.get(songId) ?? [];
  // ... preload chart data logic ...
  
  setSelectedSong({ songId, songName, artist, eamuseId, era, preloadedCharts });
  setIsDetailModalOpen(true);
}, [scores, songChartsCache]);

// Render modal at end of component
<SongDetailModal
  isOpen={isDetailModalOpen}
  onClose={() => setIsDetailModalOpen(false)}
  songId={selectedSong?.songId ?? null}
  songName={selectedSong?.songName ?? ''}
  artist={selectedSong?.artist ?? null}
  eamuseId={selectedSong?.eamuseId ?? null}
  era={selectedSong?.era ?? null}
  preloadedCharts={selectedSong?.preloadedCharts}
/>
```

### 2. GoalSongTabs.tsx - Accept and Pass Click Handler
Add a prop for the click callback and pass it to child components:

```typescript
interface GoalSongTabsProps {
  goal: Goal;
  completedSongs: ScoreWithSong[];
  remainingSongs: ScoreWithSong[];
  isLoading: boolean;
  onSongClick?: (song: ScoreWithSong) => void;  // NEW
}

// Pass to list components
<RemainingSongsList 
  songs={remainingSongs} 
  goal={goal}
  isLoading={isLoading}
  onSongClick={onSongClick}  // NEW
/>
<CompletedSongsList 
  songs={completedSongs} 
  isLoading={isLoading}
  onSongClick={onSongClick}  // NEW
/>
```

### 3. CompletedSongsList.tsx - Accept and Use Click Handler
Add the callback prop and pass it to each SongCard:

```typescript
interface CompletedSongsListProps {
  songs: ScoreWithSong[];
  isLoading: boolean;
  onSongClick?: (song: ScoreWithSong) => void;  // NEW
}

// In the render
<SongCard
  key={song.id}
  onClick={onSongClick ? () => onSongClick(song) : undefined}  // NEW
  // ... other props
/>
```

### 4. RemainingSongsList.tsx - Accept and Use Click Handler
Same pattern - add callback prop and pass to SongCards (both played and unplayed sections):

```typescript
interface RemainingSongsListProps {
  songs: ScoreWithSong[];
  goal: Goal;
  isLoading: boolean;
  onSongClick?: (song: ScoreWithSong) => void;  // NEW
}

// For both played and unplayed song cards
<SongCard
  onClick={onSongClick ? () => onSongClick(song) : undefined}  // NEW
  // ... other props
/>
```

---

## Data Flow

```text
GoalDetail.tsx (modal state + handler)
    │
    ├── handleSongClick(song)
    │     └── Opens SongDetailModal with preloaded charts
    │
    └── GoalSongTabs (passes onSongClick)
          │
          ├── CompletedSongsList (passes to SongCard onClick)
          │     └── SongCard (onClick triggers handler)
          │
          └── RemainingSongsList (passes to SongCard onClick)
                ├── Played songs → SongCard (onClick)
                └── Unplayed songs → SongCard (onClick)
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/GoalDetail.tsx` | Add modal state, handler, useSongChartsCache, render SongDetailModal |
| `src/components/goals/GoalSongTabs.tsx` | Accept onSongClick prop, pass to children |
| `src/components/goals/CompletedSongsList.tsx` | Accept onSongClick prop, pass to SongCard |
| `src/components/goals/RemainingSongsList.tsx` | Accept onSongClick prop, pass to SongCard |

---

## Key Points
- Reuses the exact same `SongDetailModal` component from Scores page
- Preloads chart data from `useSongChartsCache` for instant modal open
- Works for both played and unplayed charts
- No new components created - pure prop drilling through existing structure
