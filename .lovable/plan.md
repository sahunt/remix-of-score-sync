
# Bottom Fade Effect Implementation

## Overview
Implement a content fade effect at the bottom of the Home screen that reveals the rainbow background underneath, matching the Figma design specification.

## Technical Approach
Use CSS `mask-image` on the content container to make the content fade to transparent at the bottom, allowing the fixed rainbow background to show through naturally. This approach:
- Only affects visual rendering (transparency)
- Does not interfere with touch/click interactions
- Does not block pointer events on any content

## Changes Required

### 1. Remove Incorrect Overlay (src/components/AppLayout.tsx)
Delete the gradient overlay div (lines 9-16) that was incorrectly added. This overlay is creating an unwanted color fade rather than revealing the background.

**Before:**
```tsx
{/* Bottom fade for nav visibility - reveals background */}
<div 
  className="fixed bottom-0 left-0 right-0 h-[180px] pointer-events-none z-40"
  style={{
    background: 'linear-gradient(0deg, transparent 0%, hsl(230 18% 15%) 70%)'
  }}
/>
```

**After:** Remove entirely

### 2. Add Content Mask (src/pages/Home.tsx)
Apply a CSS mask to the content container (line 33) so the content fades out at the bottom:

**Before:**
```tsx
<div className="relative z-10 flex flex-col min-h-screen px-[28px]">
```

**After:**
```tsx
<div 
  className="relative z-10 flex flex-col min-h-screen px-[28px]"
  style={{
    maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)'
  }}
>
```

## How the Mask Works
- `mask-image` controls the visibility/transparency of an element
- `black` in the mask = content is fully visible
- `transparent` in the mask = content becomes invisible
- Top 75% of content: Fully visible
- Bottom 25%: Gradual fade to transparent, revealing the rainbow background underneath

## Files Modified
1. `src/components/AppLayout.tsx` - Remove the incorrect gradient overlay div
2. `src/pages/Home.tsx` - Add mask-image styling to the content container

## Result
The goal cards and content will smoothly fade out at the bottom, revealing the colorful rainbow background exactly as shown in the design mockups.
