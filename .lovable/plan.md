

# Change Match Mode Toggle to Blue Fill with White Stroke

## Overview
Update the sliding indicator in the `MatchModeToggle` component to use a blue fill with a white stroke (border), matching the ring-style design shown in the reference image.

## Current Behavior
The toggle indicator currently uses a solid blue background (`bg-primary`) that slides between the "Match any rule" and "Match all rules" options.

## Proposed Change
Replace the solid blue background with a blue fill combined with a white border to create the ring-style appearance shown in the reference.

---

## Technical Details

### File to Modify
**`src/components/filters/MatchModeToggle.tsx`**

### Changes
Update the sliding indicator div (lines 12-19) to add:
- A white border using `border-2 border-white`
- Keep the existing blue background fill (`bg-primary`)
- The combined effect creates a blue circle/pill with a white stroke

### Updated Styles
```tsx
// Current:
'bg-primary transition-all duration-300 ease-out'

// Updated:
'bg-primary border-2 border-white transition-all duration-300 ease-out'
```

This approach:
- Adds a 2px white border around the indicator
- Maintains the smooth sliding animation
- Creates the visual effect matching the reference image

