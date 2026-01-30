
# Stats Card Enhancement Plan

## Overview
Update the stats card to use a new background image and add an average score calculation for all played songs based on the current filters.

## Visual Changes

The stats card will be updated to match the reference design:
- New background image with a more vibrant purple gradient
- A horizontal white divider line at 50% opacity below the stats row
- A new "Avg. X,XXX,XXX" display centered below the divider

## Changes Required

### 1. Add New Background Image

Copy the uploaded `newStats.png` to the assets folder and replace the current background.

**File:** `src/assets/newStats.png` (new file)

---

### 2. Update StatsSummary Component

Modify the component to accept an optional `averageScore` prop and render the new layout.

**File:** `src/components/scores/StatsSummary.tsx`

**Changes:**
- Add `averageScore` prop to the interface (optional, can be null/undefined)
- Keep the existing stats row as-is
- Add a horizontal divider below the stats row (white line at 50% opacity)
- Add the "Avg. X,XXX,XXX" text below the divider, centered
- Import and use the new background image
- Only show the divider and average if `averageScore` is provided and greater than 0

---

### 3. Calculate Average Score in Scores Page

Add logic to compute the average score from all played songs matching the current filters (excluding songs with no score).

**File:** `src/pages/Scores.tsx`

**Changes:**
- Within the `stats` useMemo, calculate the average:
  - Filter to only songs with a non-null score
  - Sum all scores and divide by count
  - Round to whole number
- Pass the `averageScore` to the `StatsSummary` component

---

## Technical Details

### Average Score Calculation Logic

```text
1. Take the filtered scores (already filtered by level and active filters)
2. Filter out songs where score is null (no play)
3. If no played songs remain, average is 0/null
4. Otherwise: average = sum of all scores / count of played songs
5. Round to nearest integer
```

### Divider Styling

- Width: Approximately 60-70% of the card width, centered
- Height: 1px
- Color: White with 50% opacity (`rgba(255, 255, 255, 0.5)`)
- Margin: ~12px above and below for spacing

### Average Display Styling

- Text: "Avg. " followed by the formatted number (with comma separators)
- Font: Same as stats (12px bold, white)
- Centered horizontally

---

## Files to Modify

| File | Action |
|------|--------|
| `src/assets/newStats.png` | Create (copy from uploaded file) |
| `src/components/scores/StatsSummary.tsx` | Update to add divider and average display |
| `src/pages/Scores.tsx` | Add average calculation and pass to component |
