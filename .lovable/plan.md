

# Visual Consistency Audit: Goal UI vs Filter UI

## Overview
This plan addresses the styling inconsistencies between the Goal Creation sheet and the Filter Creation sheet. Both UIs should share the same global design system for drawers, headers, inputs, and interactive elements.

## Differences Identified

### 1. Drawer Container Configuration

**Filter UI:**
- Uses `DrawerPortal` + `DrawerOverlay` + `DrawerContent` with custom classes
- Background: `bg-[#3B3F51]`
- Border radius: `rounded-t-[20px]`
- No border: `border-0`
- Handle: Hidden via `hideHandle` prop
- Overlay: `bg-black/60`

**Goal UI (Current):**
- Uses basic `DrawerContent` with default styling
- Background: Default `bg-background`
- Border radius: Default `rounded-t-[10px]`
- Handle: Visible (default gray bar)
- Overlay: Default `bg-black/80`

### 2. Header Structure

**Filter UI:**
- Negative margins: `-mx-7 -mt-4` to span full width
- Padding: `px-5 py-4`
- Has kebab menu on the right side

**Goal UI (Current):**
- No negative margins (header doesn't span full width)
- Same padding but missing full-width alignment
- No kebab menu (empty spacer only)

### 3. Content Padding

**Filter UI:** `px-7 pb-8 pt-4`
**Goal UI:** `px-7 py-6`

### 4. TargetSelector Category Tabs Background

**Current Issue:** The category tabs sit inside a `bg-[#262937]` container, but the TargetSelector component has its own `bg-[#262937]` on the tab bar, creating redundant nesting. The filter UI doesn't have this double-nesting pattern.

### 5. Step Content Expansion Panels

**Current Issue:** Each step's expanded content sits inside `bg-[#262937]`, but the options panel inside (for TargetSelector) uses `bg-[#3B3F51]`. The filter UI rule cards use a single `bg-[#262937]` container without inner panels.

---

## Implementation Plan

### Task 1: Update Drawer Container in CreateGoalSheet

Update the Goal sheet to use the same drawer configuration as FilterModal:

```tsx
// Change from:
<DrawerContent className="max-h-[90vh]">

// To:
<DrawerPortal>
  <DrawerOverlay className="fixed inset-0 bg-black/60" />
  <DrawerContent 
    hideHandle 
    className="fixed bottom-0 left-0 right-0 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[20px] bg-[#3B3F51] border-0 outline-none"
  >
```

### Task 2: Update Header Positioning

Add negative margins to make header span full drawer width:

```tsx
// Change from:
<div className="flex items-center justify-between px-5 py-4 border-b border-[#4A4E61]">

// To:
<div className="flex items-center justify-between -mx-7 -mt-4 px-5 py-4 border-b border-[#4A4E61]">
```

### Task 3: Update Content Area Padding

Match the filter sheet padding pattern:

```tsx
// Change from:
<div className="px-7 py-6 space-y-6 overflow-y-auto">

// To:
<div className="flex-1 overflow-y-auto px-7 pb-8 pt-4">
  <div className="space-y-6">
```

### Task 4: Update TargetSelector Background Nesting

Remove the redundant `bg-[#262937]` from the TargetSelector tab bar since it will be inside a step container that already has that background:

```tsx
// In TargetSelector.tsx, change:
<div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">

// To:
<div className="relative flex items-center rounded-[10px] bg-[#3B3F51] p-1.5">
```

This makes the tab bar consistent with the FilterRuleRow dropdowns which use `bg-[#3B3F51]`.

### Task 5: Update Step Container Colors

The step expansion containers should follow the filter card pattern:

**Step Header (collapsed):**
- Background: `bg-[#262937]` (matches rule card)
- When expanded: Same `bg-[#262937]` with `border-primary/30`

**Step Content (expanded):**
- Currently using `mt-3 p-4 rounded-[10px] bg-[#262937]` 
- This creates a **separate** card below the header

**Recommended change:** Make expanded content flow inside the same card as the header, not as a separate card. But this is a structural change that may be intentional for the accordion UX. The minimum fix is ensuring color values match the filter system.

### Task 6: Update GoalModeToggle Background

The toggle currently has `bg-[#262937]` but it sits inside a step container that's also `bg-[#262937]`. Change to:

```tsx
// In GoalModeToggle.tsx, change:
<div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">

// To:
<div className="relative flex items-center rounded-[10px] bg-[#3B3F51] p-1.5">
```

---

## Files to Modify

1. **src/components/goals/CreateGoalSheet.tsx**
   - Update Drawer structure to use DrawerPortal + DrawerOverlay
   - Add hideHandle prop
   - Update drawer background, border-radius, and overlay
   - Add negative margins to header
   - Update content padding structure

2. **src/components/goals/TargetSelector.tsx**
   - Change category tab bar background from `bg-[#262937]` to `bg-[#3B3F51]`

3. **src/components/goals/GoalModeToggle.tsx**
   - Change toggle bar background from `bg-[#262937]` to `bg-[#3B3F51]`

---

## Technical Details

### Color Reference (Global Design System)

| Element | Color Code | Usage |
|---------|------------|-------|
| Drawer Background | `#3B3F51` | Main drawer/modal background |
| Card/Rule Container | `#262937` | Cards, rule rows, step containers |
| Input/Interactive | `#3B3F51` | Dropdowns, input fields, toggles inside cards |
| Border | `#4A4E61` | Header separator, dividers |
| Primary | `#6692FA` | Active states, CTAs |

### Nesting Pattern

```text
Drawer Background (#3B3F51)
  └── Card/Container (#262937)
        └── Interactive Elements (#3B3F51)
              └── Nested Items (#4A4E61)
```

