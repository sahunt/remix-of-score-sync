
# Inline Offset Editor (Replacing Popover)

## Overview
Replace the problematic popover with an inline edit mode that transforms the offset chip area. When tapped, the chip smoothly transitions into an input field with save/cancel buttons, then animates back when editing is complete.

## User Flow

```text
DISPLAY MODE                    EDIT MODE
┌─────────────┐                ┌──────────────────────────┐
│   -6ms      │  ──tap──►      │ [___] ms  ✓  ✗  ↺       │
└─────────────┘                └──────────────────────────┘
                   ◄──save/cancel──
```

## Visual Design

**Display Mode:**
- Current OffsetChip (unchanged)
- Shows offset value or "Add offset"

**Edit Mode:**
- Compact horizontal layout within the same space
- Number input (small, ~40px wide)
- "ms" label
- Save button (checkmark icon)
- Cancel button (X icon)  
- Reset button (only if custom offset exists)

## Animation Strategy

Use CSS transitions for smooth state changes:
- `animate-fade-in` / `animate-fade-out` for content swap
- Scale transition on the container to accommodate width change
- Duration: 200ms for snappy feel

## Technical Changes

### 1. Create Inline Offset Editor Component
**New file: `src/components/scores/OffsetInlineEditor.tsx`**

A single component that handles both display and edit modes:
- Internal state: `isEditing` boolean
- Display mode: renders OffsetChip
- Edit mode: renders input + action buttons
- Handles save/clear/cancel logic internally
- Animates between states

Props:
```typescript
interface OffsetInlineEditorProps {
  effectiveOffset: number | null;
  globalOffset: number | null;
  hasCustomOffset: boolean;
  onSave: (offset: number) => Promise<void>;
  onClear: () => Promise<void>;
}
```

### 2. Update Song Detail Modal
**File: `src/components/scores/SongDetailModal.tsx`**

- Remove OffsetEditPopover import and usage
- Remove `offsetPopoverOpen` state
- Replace with new OffsetInlineEditor component
- Pass same props from useOffset hook

### 3. Delete OffsetEditPopover
**File: `src/components/scores/OffsetEditPopover.tsx`**

- Remove this file entirely since it's no longer needed

## Component Structure (OffsetInlineEditor)

```tsx
// Display mode
<div className="animate-fade-in">
  <OffsetChip onClick={() => setEditing(true)} />
</div>

// Edit mode  
<div className="animate-fade-in flex items-center gap-1.5">
  <Input type="number" className="w-12 h-6 text-xs" />
  <span className="text-xs text-muted-foreground">ms</span>
  <Button size="icon" variant="ghost" onClick={save}>✓</Button>
  <Button size="icon" variant="ghost" onClick={cancel}>✕</Button>
  {hasCustomOffset && (
    <Button size="icon" variant="ghost" onClick={reset}>↺</Button>
  )}
</div>
```

## Edit Mode Layout Details

- Input: 48px wide, number type, -99 to +99 range
- Buttons: 24x24px icon buttons (Check, X, RotateCcw icons from lucide)
- Total width: ~140px in edit mode vs ~50px in display mode
- Container uses `min-w-fit` to accommodate both states

## Files to Create
1. `src/components/scores/OffsetInlineEditor.tsx`

## Files to Modify
1. `src/components/scores/SongDetailModal.tsx` - Use new inline editor

## Files to Delete
1. `src/components/scores/OffsetEditPopover.tsx` - No longer needed
