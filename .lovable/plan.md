
# Fix: Song Detail Modal Missing Scores

## Problem Identified
The Song Detail Modal shows "No play" for difficulties that actually have scores in the database. This happens because both **Scores.tsx** and **GoalDetail.tsx** are building the modal's `scoreMap` from **filtered data** instead of the complete user score history.

**Example:**
- User views Goal Detail page for a goal targeting Level 14 Expert charts
- User clicks on "Red. by Full Metal Jacket" 
- Modal shows Challenge (17) as "No play" even though a 999,710 score exists
- Root cause: The goal-filtered `scores` array only includes Level 14 data, so the Level 17 Challenge score is never passed to the modal

## Data Flow Issue

```text
Current (Broken):
┌─────────────────────────────────────────────────────────────┐
│ GoalDetail.tsx                                              │
│   scores = useUserScores({ filterRules: criteriaRules })    │
│   └── Only Level 14 Expert scores fetched                   │
│                                                             │
│   handleSongClick():                                        │
│     scoreMap = scores.filter(song_id)                       │
│     └── Missing Level 17 Challenge score!                   │
│                                                             │
│   Modal: Challenge shows "No play" ❌                        │
└─────────────────────────────────────────────────────────────┘

Fixed:
┌─────────────────────────────────────────────────────────────┐
│ GoalDetail.tsx                                              │
│   globalScores = useScores() // ALL user scores             │
│   goalScores = useUserScores({ filterRules }) // for lists  │
│                                                             │
│   handleSongClick():                                        │
│     scoreMap = globalScores.filter(song_id)                 │
│     └── Has ALL scores for this song                        │
│                                                             │
│   Modal: Challenge shows 999,710 ✓                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Changes Required

### 1. GoalDetail.tsx - Use Global Scores for Modal

**Add import:**
```typescript
import { useScores } from '@/contexts/ScoresContext';
```

**Add global scores hook:**
```typescript
// Use global scores cache for modal preloading (all difficulties)
const { scores: globalScores } = useScores();
```

**Update handleSongClick to use globalScores:**
```typescript
// Build score lookup from ALL user scores (not goal-filtered)
const scoreMap = new Map(
  globalScores  // Changed from: scores
    .filter(s => (s.musicdb?.song_id ?? s.song_id) === songId)
    .map(s => [s.difficulty_name?.toUpperCase(), s])
);
```

**Update dependency array:**
```typescript
}, [globalScores, songChartsCache]);  // Changed from: [scores, songChartsCache]
```

### 2. Scores.tsx - Use Global Scores for Modal

The Scores page already imports `useScores()` for its `globalScores`, but uses `filteredScores` for the modal. Update to use `globalScores`:

**Update handleSongClick to use globalScores:**
```typescript
// Build score lookup from ALL user scores (not level-filtered)
const scoreMap = new Map(
  globalScores  // Changed from: filteredScores
    .filter(s => s.musicdb?.song_id === song.song_id)
    .map(s => [s.difficulty_name?.toUpperCase(), s])
);
```

**Update dependency array:**
```typescript
}, [globalScores, songChartsCache]);  // Changed from: [filteredScores, songChartsCache]
```

---

## Technical Notes

- The filtered data (`filteredScores` / `scores`) should still be used for displaying the song **list** (respects level/filter selection)
- The unfiltered global data (`globalScores`) should be used for the **modal** (needs all difficulties for the selected song)
- No additional API calls are introduced - both data sources are already cached via React Query
- The architecture rule from `docs/architecture-rules.md` is being followed: "Consume scores from useScores() context"

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/GoalDetail.tsx` | Import useScores, use globalScores in handleSongClick |
| `src/pages/Scores.tsx` | Use globalScores instead of filteredScores in handleSongClick |
