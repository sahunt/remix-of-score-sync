
# Add Offset Chip to Song Detail Modal

## Overview
Add an interactive offset chip to the Song Detail Modal that displays the song's judgement offset and allows users to set a custom offset. The chip follows the same conversion logic as EDI and uses the existing chip styling patterns.

## Offset Conversion Logic (Matching EDI)

The offset conversion follows the exact same rules defined in the `edi-chat` edge function:

```text
Database: song_bias.bias_ms (raw timing value)
User-facing offset: Math.round(-bias_ms)

Examples:
- bias_ms = 5.81  → User sees "-6ms"
- bias_ms = -3.08 → User sees "+3ms"
- bias_ms = 0.73  → User sees "-1ms"
```

Display format: `+Xms` or `-Xms` (always show sign for clarity)

## Data Flow

```text
                   ┌─────────────────┐
                   │   song_bias     │
                   │ (global offset) │
                   └────────┬────────┘
                            │
                            ▼
┌─────────────────┐    ┌─────────────────────────┐
│user_song_offsets│───▶│ Display Logic:          │
│ (custom offset) │    │ custom > global > none  │
└─────────────────┘    └─────────────────────────┘
```

- **Has global, no custom**: Show global offset with chip
- **Has custom**: Show custom offset (visually distinct - filled style)
- **No data at all**: Show "Add offset" as tappable chip

## Technical Changes

### 1. Create Offset Utility Functions
**New file: `src/lib/offsetUtils.ts`**

Shared utilities for offset conversion (single source of truth):
- `biasToUserOffset(biasMs: number)`: Convert DB bias_ms to user-facing integer
- `userOffsetToBias(userOffset: number)`: Convert user input back to bias_ms
- `formatOffset(offset: number | null)`: Format as "+3ms" or "-6ms"

### 2. Create Offset Chip Component
**New file: `src/components/ui/OffsetChip.tsx`**

A small, tappable chip similar to EraChip/HaloChip:
- Displays offset value (e.g., "-6ms") or "Add offset"
- Outline variant when showing global offset
- Filled variant when showing custom offset
- onClick handler to open edit modal

### 3. Create Offset Edit Modal/Popover
**New file: `src/components/scores/OffsetEditPopover.tsx`**

A small popover that appears when tapping the chip:
- Shows current offset value (global or custom)
- Input field for custom offset (-99 to +99 range)
- Save button to store custom offset
- Clear/Reset button to delete custom and revert to global
- Cancel to close without changes

### 4. Create Offset Data Hook
**New file: `src/hooks/useOffset.ts`**

Hook to manage offset data:
- Fetch song_bias for given song_id
- Fetch user_song_offsets for current user
- Combine to determine effective offset
- CRUD operations for user custom offsets

### 5. Update Song Detail Modal
**File: `src/components/scores/SongDetailModal.tsx`**

Add the OffsetChip below the Era chip in the header section:
- Pass song_id to useOffset hook
- Render OffsetChip with onClick to open OffsetEditPopover
- Handle save/clear callbacks

## Component Placement in Modal

```text
┌────────────────────────────┐
│        [Jacket Art]        │
│          ARTIST            │
│        Song Title          │
│        [Era Chip]          │
│       [Offset Chip] ← NEW  │
├────────────────────────────┤
│ ■ 18  │ 999,450  AAA  PFC  │
│ ■ 16  │ 998,200  AA+  GFC  │
│ ■ 14  │ No play            │
├────────────────────────────┤
│         [ Close ]          │
└────────────────────────────┘
```

## Chip Visual States

| State | Appearance | Label |
|-------|------------|-------|
| Global offset only | Outline chip, muted | `-6ms` |
| Custom offset set | Filled chip, primary | `+3ms` |
| No offset data | Outline chip, dashed | `Add offset` |

## Files to Create

1. `src/lib/offsetUtils.ts` - Shared conversion functions
2. `src/components/ui/OffsetChip.tsx` - Display chip
3. `src/components/scores/OffsetEditPopover.tsx` - Edit UI
4. `src/hooks/useOffset.ts` - Data fetching and mutations

## Files to Modify

1. `src/components/scores/SongDetailModal.tsx` - Add chip integration

## Implementation Order

1. Create offset utility functions (pure logic, testable)
2. Create useOffset hook (data layer)
3. Create OffsetChip component (display)
4. Create OffsetEditPopover (edit UI)
5. Integrate into SongDetailModal
6. Test end-to-end flow
