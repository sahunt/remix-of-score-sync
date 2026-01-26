
# Home Screen Redesign Implementation Plan

## Overview
This plan updates the Home screen to match the Figma/Builder.io design, focusing on the header, search bar, goal cards, and overall layout improvements.

---

## Changes Summary

### 1. Header Section Updates
**Current state:** Avatar in bordered pill with logout button visible
**Target state:** Clean avatar + text greeting with drop shadow, no logout button

- Remove the bordered pill container around "Hi {username}"
- Display greeting as styled text with drop shadow effect
- Remove logout button from header (will be accessible from profile/settings later)
- Adjust avatar size from 48px to 44px
- Format greeting as "Hi{username}" (no space after "Hi")

### 2. Search Bar Updates
**Current state:** Backdrop blur with border, rounded-full
**Target state:** Solid secondary background, 10px border radius

- Change background from `bg-secondary/80 backdrop-blur-sm` to solid `bg-secondary`
- Update border radius from `rounded-full` to `rounded-[10px]`
- Update placeholder text to "Search by song title..."
- Remove border styling

### 3. Goal Cards Redesign (Major)
**Current state:** Simple cards with icon, title, subtitle, and basic progress bar
**Target state:** Rich cards with badge chips, song info, artwork grid, and completion progress

New GoalCard structure:
- **Badge Chip** (top-left): Colored chip with sparkle icons showing goal type
  - PFC (Perfect Full Combo) - Yellow/gold theme
  - MFC (Marvelous Full Combo) - Pink/magenta theme  
  - GFC (Great Full Combo) - Green theme
- **Song Info Section**: Title and difficulty/level metadata
- **Album Art Grid** (right side): Placeholder grid of song thumbnails
- **Progress Bar**: Bottom with "X/Y completed" text format

### 4. New GoalBadge Component
Create a reusable badge component for goal types with sparkle decorations:
- Extends existing Chip component patterns
- Color variants: pfc (yellow), mfc (pink), gfc (green)
- Includes sparkle/star decorations on sides

### 5. Remove "Your Goals" Section Header
Based on the design, the section header with "View All" link should be removed for a cleaner look.

### 6. Layout Adjustments
- Character emoji positioning adjustments
- Ensure proper spacing for bottom navigation
- Goal cards should have proper 10px border radius per design system

---

## Files to Create

### `src/components/home/GoalBadge.tsx`
New component for goal type badges (PFC/MFC/GFC) with sparkle decorations and color variants.

---

## Files to Modify

### `src/pages/Home.tsx`
- Remove logout button from header
- Simplify greeting to styled text with shadow (no pill container)
- Remove "Your Goals" section header with "View All"
- Update GoalCard props to match new component API
- Adjust avatar size to 44px

### `src/components/home/GoalCard.tsx`
Complete redesign with:
- GoalBadge integration for type display
- Two-column layout (info left, artwork right)
- Song title and difficulty metadata
- Redesigned progress bar with "X/Y completed" format
- New props: `type` (pfc/mfc/gfc), `current`, `total`, `songs` (for artwork)

### `src/components/home/SearchBar.tsx`
- Update background to solid `bg-secondary`
- Change border radius to `rounded-[10px]`
- Update default placeholder to "Search by song title..."
- Remove border and backdrop blur

### `src/index.css`
Add new CSS utilities:
- Text shadow utility for header greeting
- Goal badge color variants (pfc-yellow, mfc-pink, gfc-green)

---

## Technical Details

### GoalBadge Color Scheme
```text
PFC (Perfect Full Combo):
- Background: Yellow/Gold (#FFD700 area)
- Text: Dark foreground
- Sparkle icons on left and right

MFC (Marvelous Full Combo):
- Background: Pink/Magenta (#FF69B4 area)
- Text: Dark foreground
- Sparkle icons on left and right

GFC (Great Full Combo):
- Background: Green (#4ADE80 area)
- Text: Dark foreground
- Sparkle icons on left and right
```

### GoalCard Props Update
```text
Current Props:
- title: string
- subtitle?: string
- progress?: number
- iconName?: string
- variant?: 'default' | 'accent'

New Props:
- title: string (song name)
- difficulty: string (e.g., "ESP")
- level: number (e.g., 18)
- type: 'pfc' | 'mfc' | 'gfc'
- current: number (completed count)
- total: number (target count)
- artworks?: string[] (placeholder for song artwork URLs)
```

### Progress Display Format
Instead of percentage-based progress, use fraction format:
- "12/33" with "completed" label
- Progress bar width calculated from current/total

---

## Implementation Order

1. **Add CSS utilities** - Text shadow and goal badge colors in index.css
2. **Create GoalBadge component** - Reusable badge with sparkle decorations
3. **Update SearchBar** - Quick styling changes
4. **Redesign GoalCard** - New layout with badge, info, artwork grid, progress
5. **Update Home page** - Integrate all changes, update header, remove section header

---

## Design System Compliance
- Uses existing Icon component for sparkle decorations ("star" or "auto_awesome")
- Follows 10px border radius convention
- Uses established color tokens where possible
- New color tokens added for goal badge variants
- Maintains Poppins font family throughout
