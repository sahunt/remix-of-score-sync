
# Song Card Component Implementation Plan

## Overview
This plan creates a pixel-perfect song card component that displays DDR score data including song title, difficulty rating, score, rank, flare badge, and halo badge. The card includes a halo-colored top bar, difficulty-colored left accent on the album art, and properly aligned badge chips.

## Visual Reference Analysis
Based on the provided mockup:
- Card dimensions: Full width, 57px height, 10px border radius
- Top halo bar: 4px height, spans full width
- Album art: ~40px with difficulty color bar on left edge
- Title row: Song name (truncated with ellipsis) + difficulty level chip (14x14px)
- Score row: Large score number + rank badge (with text stroke)
- Right side: Fixed-width area (20px gap from content) for Flare chip + Halo chip

---

## Step 1: Add Halo Color Variables to Global Styles

Update `src/index.css` to add the halo/status colors as CSS variables after the difficulty colors:

```css
/* Halo/Status colors for song cards */
--halo-pfc: #F9CD67;
--halo-gfc: #63EAA8;
--halo-fc: #9EBBFF;
--halo-mfc-gradient: linear-gradient(90deg, #B5EFFF 0%, #FDB8FF 34.62%, #D4B8FF 72.6%, #FFF 100%);
--halo-failed: #4C062F;
--halo-cleared: #A6ACC4;
--halo-life4: #FF565E;
```

---

## Step 2: Create New SongCard Component

Create `src/components/scores/SongCard.tsx`:

### Component Props
```typescript
interface SongCardProps {
  name: string;
  difficultyLevel: number | null;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  className?: string;
}
```

### Card Structure
```text
+------------------------------------------------------------------+
| [HALO COLOR BAR - 4px height, full width, rounded top corners]   |
+------------------------------------------------------------------+
|  +--------+  SONG TITLE HERE...  [14]           [FLARE] [HALO]   |
|  | ALBUM  |                                                       |
|  | [diff] |  999,970  AAA                                         |
|  +--------+                                                       |
+------------------------------------------------------------------+
```

### Layout Implementation Details

1. **Container**: 
   - `w-full rounded-[10px] bg-[#3B3F51] overflow-hidden relative`
   
2. **Top Halo Bar**:
   - Absolute positioned, `h-1 w-full top-0 left-0`
   - Background color based on halo type (MFC uses gradient)
   - Default to "cleared" color (#A6ACC4) if no halo

3. **Main Content Container**:
   - `flex items-center gap-3 px-3 pt-[8px] pb-3` (accounting for 4px top bar)
   
4. **Album Art with Difficulty Bar**:
   - Container: `w-10 h-10 rounded-lg bg-muted relative overflow-hidden flex-shrink-0`
   - Difficulty bar: Absolute left edge, `w-[4px] h-full` with difficulty color
   - Placeholder music note icon centered

5. **Song Info Section**:
   - Container: `flex-1 min-w-0 flex flex-col justify-center`
   - **Title row**: `flex items-center gap-2`
     - Title: `truncate` class for ellipsis on long names
     - Style: `text-sm font-medium text-white`
   - **Difficulty chip**: Fixed 14x14px, 4px border radius
     - Style: `text-[10px] font-bold leading-[18px] text-[#000F33]`
     - Background: difficulty color based on level
   
6. **Score Row**:
   - `flex items-center gap-1`
   - **Score display**: 
     - If score exists: `text-lg font-bold text-white tabular-nums` showing formatted number
     - If score is null: Show "No score" in muted text style
   - **Rank badge**: 
     - Style: `text-[10px] font-bold leading-[18px] text-[#000F33]`
     - Text stroke: `-webkit-text-stroke: 2px #FFF3D6`

7. **Badge Area (Right Side)**:
   - Container: `flex-shrink-0 flex items-center gap-2 ml-5` (20px gap)
   - Fixed width: `w-[72px] flex justify-end` for consistent alignment
   - Flare chip: Show FlareChip component or empty 28px space
   - Halo chip: Show HaloChip component or empty 40px space

### Helper Functions

1. **getHaloBarStyle(halo: string | null)**: Returns background style object for the top bar
2. **getDifficultyColorClass(level: number)**: Maps level range to difficulty class name
3. **flareNumberToRoman(flare: number | null)**: Converts 1-9 to 'i'-'ix', 10 to 'ex'
4. **normalizeHaloType(halo: string | null)**: Converts DB halo string to HaloType

---

## Step 3: Update Scores Page

Replace `SongCardPlaceholder` with new `SongCard` in `src/pages/Scores.tsx`:

```tsx
import { SongCard } from '@/components/scores/SongCard';

// In the render:
{displayedScores.map((s) => (
  <SongCard
    key={s.id}
    name={s.musicdb?.name ?? 'Unknown Song'}
    difficultyLevel={s.difficulty_level}
    score={s.score}
    rank={s.rank}
    flare={s.flare}
    halo={s.halo}
  />
))}
```

---

## Technical Specifications

### Typography
| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Title | Poppins | 14px | 500 | white |
| Difficulty chip | Poppins | 10px | 700 | #000F33 |
| Score | Poppins | 18px | 700 | white |
| No score text | Poppins | 14px | 400 | muted-foreground |
| Rank | Poppins | 10px | 700 | #000F33 + 2px stroke #FFF3D6 |

### Spacing
| Element | Value |
|---------|-------|
| Card padding | 12px horizontal, 8px top, 12px bottom |
| Album art to content gap | 12px |
| Title to difficulty chip gap | 8px |
| Score to rank gap | 4px |
| Content to badge area gap | 20px |
| Flare to halo gap | 8px |

### Halo Bar Colors
| Status | Color/Gradient |
|--------|---------------|
| PFC | #F9CD67 (gold) |
| GFC | #63EAA8 (green) |
| FC | #9EBBFF (blue) |
| MFC | linear-gradient(90deg, #B5EFFF 0%, #FDB8FF 34.62%, #D4B8FF 72.6%, #FFF 100%) |
| LIFE4 | #FF565E (red) |
| Failed | #4C062F (dark red) |
| Cleared/Default | #A6ACC4 (gray) |

### Difficulty Level Mapping
| Level Range | Class |
|-------------|-------|
| 1-5 | difficulty-beginner |
| 6-8 | difficulty-basic |
| 9-12 | difficulty-difficult |
| 13-16 | difficulty-expert |
| 17-19 | difficulty-challenge |

---

## Files to Create/Modify

1. **Create**: `src/components/scores/SongCard.tsx` - New song card component
2. **Modify**: `src/index.css` - Add halo color CSS variables
3. **Modify**: `src/pages/Scores.tsx` - Replace SongCardPlaceholder with SongCard

---

## Edge Cases Handled

- **Long titles**: Truncated with ellipsis, difficulty chip always visible
- **Null flare/halo**: Empty placeholder space maintained for visual alignment in lists
- **Null score**: Shows "No score" text in muted style
- **Null rank**: Hidden (no space needed since it follows score)
- **Null difficulty**: No difficulty bar or chip shown
