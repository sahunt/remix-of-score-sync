
# Song Card Era Chip Implementation

## Overview
Add era chips (Classic, White, Gold) to the SongCard component. The chips will display below the song title, center-aligned. This lays the groundwork for future icons to be added in the same row.

## Data Flow Changes

### 1. Add Era to Database Queries
The `era` field already exists in the `musicdb` table. Need to add it to all queries that fetch song data:

- **src/pages/Scores.tsx**: Add `era` to the musicdb selection in the user_scores query
- **src/hooks/useUserScores.ts**: Add `era` to the musicdb selection
- **src/hooks/useSongChartsCache.ts**: Check if era is fetched for modal display

### 2. Update Type Definitions
Update interfaces to include era:
- **src/pages/Scores.tsx**: Add `era` to `ScoreWithSong`, `MusicDbChart`, and `DisplaySong` interfaces
- **src/hooks/useGoalProgress.ts**: Add `era` to `ScoreWithSong` interface

## Component Changes

### 3. Create Era Assets
Copy the uploaded SVG files to `src/assets/eras/`:
- `era_classic.svg` (from classicerachip.svg)
- `era_white.svg` (from whiteerachip.svg)  
- `era_gold.svg` (from golderachip.svg)

### 4. Create EraChip Component
New file: `src/components/ui/EraChip.tsx`
- Props: `era: 0 | 1 | 2 | null`
- Map: 0 = Classic, 1 = White, 2 = Gold
- Returns null if era is null/undefined
- Follows FlareChip pattern: imports SVGs and renders as img

### 5. Update SongCard Component
File: `src/components/scores/SongCard.tsx`

Changes:
- Add `era?: number | null` prop
- Add new icon row below the title row (between title and score)
- Center-align icons with `justify-center`
- Use 4px gap between icons
- Only render the icon row if there's at least one icon to show

Layout update:
```
[Album Art] [Song Info Section]              [Rank]
            [14] SONG TITLE
            [Era Icon] ← new row, center-aligned
            999,999 [Flare]
```

### 6. Update Consumers of SongCard
Pass era through in all places using SongCard:

- **src/components/scores/VirtualizedSongList.tsx**: Add era to SongRow and SongCard props
- **src/components/goals/CompletedSongsList.tsx**: Add era prop
- **src/components/goals/RemainingSongsList.tsx**: Check and add era prop
- **src/components/goals/SuggestionsList.tsx**: Check and add era prop

### 7. Update VirtualizedSongList Height Estimate
Since we're adding a new row, the card height increases. Update the `estimateSize` from 70px to approximately 88px to account for the new icon row.

## UX Spacing Guidelines
- Icon row: 4px gap between icons (gap-1)
- Icon row margin: 2px above (mt-0.5)
- Icons center-aligned with `justify-center`
- Only render row if icons exist to prevent empty space

## Technical Details

### Era Mapping
```typescript
type EraType = 'classic' | 'white' | 'gold';

const eraNumberToType = (era: number | null): EraType | null => {
  if (era === null || era === undefined) return null;
  const mapping: Record<number, EraType> = {
    0: 'classic',
    1: 'white',
    2: 'gold'
  };
  return mapping[era] ?? null;
};
```

### Files to Modify
1. `src/assets/eras/` - new folder with 3 SVGs
2. `src/components/ui/EraChip.tsx` - new component
3. `src/components/scores/SongCard.tsx` - add era prop and icon row
4. `src/components/scores/VirtualizedSongList.tsx` - pass era, update height
5. `src/pages/Scores.tsx` - add era to types and query
6. `src/hooks/useUserScores.ts` - add era to query
7. `src/hooks/useGoalProgress.ts` - add era to type
8. `src/components/goals/CompletedSongsList.tsx` - pass era
9. `src/components/goals/RemainingSongsList.tsx` - pass era
10. `src/components/goals/SuggestionsList.tsx` - pass era

## Future Extensibility
The icon row structure allows easily adding more chips in the future by simply adding more components to the flex container. The center alignment and gap spacing will automatically accommodate additional icons.
