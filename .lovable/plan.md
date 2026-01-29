
# Song Details Modal Implementation

## Overview
When a user taps a song card on the Scores page, a modal opens showing:
- Song header (jacket, artist, title)
- All SP difficulty charts from musicdb with user scores
- Each row displays: difficulty chip, score, rank, flare, halo badge, and source icon

## New Files

### 1. Source Icons
Save the uploaded SVGs to the assets folder:
- `src/assets/sources/sanbai.svg`
- `src/assets/sources/phaseii.svg`

### 2. SourceIcon Component
**File:** `src/components/ui/SourceIcon.tsx`

A small component displaying the data source icon (similar pattern to FlareChip/HaloChip):
- Props: `source: 'sanbai' | 'phaseii' | string`
- Size: 16x16px circular icon
- Future sources can be added by adding new SVG files

### 3. Song Detail Modal
**File:** `src/components/scores/SongDetailModal.tsx`

The main modal component with:

**Header Section:**
- 80x80px song jacket (no difficulty shadow - just the song art)
- Artist name (10px uppercase, muted color, letter-spacing)
- Song title (16px bold white)

**Difficulty Rows:**
- Query all SP charts from musicdb for the song
- Order: Challenge, Expert, Difficult, Basic, Beginner (descending by level)
- Only show rows where `difficulty_level` is not null
- Each row contains:
  - Difficulty chip (14x14px, colored by level)
  - Score (formatted) or "No play" text
  - Rank badge (AAA, AA+, etc.)
  - FlareChip (if score exists with flare)
  - HaloChip (full badge, if score exists with halo)
  - SourceIcon (if score exists)

**Footer:**
- Close button (primary style, full-width, rounded-full)

## Modified Files

### 1. SongCard Component
**File:** `src/components/scores/SongCard.tsx`

Add:
- `onClick?: () => void` prop
- Wrapper with click handler and cursor-pointer styling

### 2. Scores Page
**File:** `src/pages/Scores.tsx`

Add:
- State: `selectedSongId: number | null`
- State: `isDetailModalOpen: boolean`
- Click handler passed to SongCard
- SongDetailModal rendered conditionally
- Pass song_id and eamuse_id to modal for data fetching

## Data Fetching Strategy

When modal opens with a `song_id`:

1. **Fetch all SP charts for this song:**
```typescript
const { data: charts } = await supabase
  .from('musicdb')
  .select('id, difficulty_name, difficulty_level, eamuse_id')
  .eq('song_id', songId)
  .eq('playstyle', 'SP')
  .not('difficulty_level', 'is', null)
  .order('difficulty_level', { ascending: false });
```

2. **Fetch user's scores for these charts:**
```typescript
const chartIds = charts.map(c => c.id);
const { data: scores } = await supabase
  .from('user_scores')
  .select('musicdb_id, score, rank, flare, halo, source_type')
  .eq('user_id', userId)
  .in('musicdb_id', chartIds);
```

3. **Merge data:** Map each chart to its score (or null if no play)

## Visual Layout

```text
+------------------------------------------+
|                                          |
|    [  80x80 Jacket  ]                    |
|                                          |
|    ARTIST NAME                           |
|    Song Title                            |
|                                          |
+------------------------------------------+
|                                          |
|  [18] 999,870  AAA [IX] [PFC] [sanbai]   |
|  [15] 998,420  AA+ [VI] [GFC] [phaseii]  |
|  [10] No play                            |
|  [5]  No play                            |
|                                          |
|           [    Close    ]                |
|                                          |
+------------------------------------------+
```

## Styling Notes

- Modal uses Dialog component from existing UI library
- Background follows visual hierarchy: modal content uses `#3B3F51`
- Inner content uses standard padding patterns (px-6, py-4)
- Difficulty chips reuse existing `getDifficultyColorClass` helper from SongCard
- 12MS Mode transformations apply to halo display (using existing HaloChip)
- Rows use flexbox with `justify-between` for even spacing

## Edge Cases

| Case | Behavior |
|------|----------|
| No CHALLENGE chart exists | Row not shown |
| User hasn't played a difficulty | Show "No play" (muted text) |
| No rank/flare/halo/source | Hide that element |
| Unknown source_type | Hide source icon |
| Song has no SP charts | Show empty state message |

## Technical Considerations

- Modal receives `song_id`, `eamuse_id`, `songName`, and `artist` from clicked card
- Jacket uses same fallback chain as SongCard (eamuse_id → song_id → placeholder)
- Loading state shown while fetching chart/score data
- The `source_type` field already exists in `user_scores` table
