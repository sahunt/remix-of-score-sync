

# Goal Detail Page Implementation Plan

## Overview
Create a dedicated Goal Detail Page that users reach by tapping a goal card on the Home page. This page intelligently adapts its content based on the goal type, showing completed songs, remaining targets, and smart recommendations where applicable.

## The Two Goal Modes

| Mode | Example | What to Show |
|------|---------|--------------|
| **All (100%)** | "PFC all 14s" | Clear list of what's done + what's remaining |
| **Count** | "MFC 10 songs" | What's done + smart recommendations for what to try next |

---

## Page Layout

```text
+----------------------------------+
|  <  Goal Details                 |  <- Back to Home
+----------------------------------+
|                                  |
|  +----------------------------+  |
|  |  [PFC]                     |  |  <- Goal Card (same as Home)
|  |  PFC all 14s               |  |
|  |  23/47 completed           |  |
|  |  [========------]          |  |
|  +----------------------------+  |
|                                  |
|  [Completed (23)]  [Remaining (24)]  <- Tabs
|  --------------------------------|
|                                  |
|  [ Song Cards... ]               |
|                                  |
+----------------------------------+
```

---

## Tab Behavior by Goal Mode

### Mode: "All" (e.g., PFC all 14s)

**Completed Tab:**
- Shows all charts matching criteria that have achieved the target
- Uses standard SongCard component
- Sorted by score (highest first) or alphabetically

**Remaining Tab:**
- Shows all charts matching criteria that have NOT achieved the target
- Primary focus: What's left to accomplish
- Sorted by "closest to goal" (most helpful for grinding)

**Sorting "Remaining" by Proximity:**

For lamp targets (PFC, MFC, etc.):
```text
Goal: PFC all 14s

Closest to goal:
1. Song A - Level 14 - GFC (one step away from PFC)
2. Song B - Level 14 - FC (two steps away)
3. Song C - Level 14 - Clear (further away)
4. Song D - Level 14 - No score (hasn't been played)
```

For grade targets (AAA):
```text
Goal: AAA all 15s

Closest to goal:
1. Song A - 995,000 - AA+ (almost there)
2. Song B - 980,000 - AA (getting close)
3. Song C - 950,000 - A+ (needs work)
```

For flare targets:
```text
Goal: Flare IX on all Experts

Closest to goal:
1. Song A - Flare VIII (one level away)
2. Song B - Flare VII (two levels away)
3. Song C - Flare V (needs improvement)
```

### Mode: "Count" (e.g., MFC 10 songs)

**Completed Tab:**
- Shows songs that have achieved the target and count toward the goal
- Example: "10 songs MFC'd" shows those 10 songs

**Suggestions Tab (replaces "Remaining"):**
- Can't show a definitive "remaining" list since any song could qualify
- Instead: Smart recommendations based on user's existing scores

**Recommendation Logic for Count Goals:**

```text
Goal: MFC 10 songs

Suggestions (sorted by likelihood of success):
1. Songs with PFC + high score (closest to MFC)
2. Songs with GFC + very high score
3. Songs the user plays frequently with improving trends
```

```text
Goal: Flare EX on 5 songs

Suggestions:
1. Songs with Flare IX + high score
2. Songs with multiple plays at Flare IX
3. Lower level songs where EX is more achievable
```

---

## Technical Implementation

### New Files

```text
src/
  pages/
    GoalDetail.tsx              - Goal detail page
  components/
    goals/
      GoalDetailHeader.tsx      - Back button + title
      GoalTabNav.tsx            - Completed/Remaining tab toggle
      CompletedSongsList.tsx    - List of achieved songs
      RemainingSongsList.tsx    - List for "all" mode goals
      SuggestionsList.tsx       - Recommendations for "count" mode
  hooks/
    useGoalProgress.ts          - Extended to return song lists
```

### Route Addition

```tsx
// App.tsx - new route
<Route path="/goal/:goalId" element={<GoalDetail />} />
```

### Extended Goal Progress Hook

The existing progress calculation needs to return the actual song arrays:

```typescript
interface GoalProgressResult {
  current: number;
  total: number;
  completedSongs: ScoreWithSong[];       // Songs that achieved the target
  remainingSongs: ScoreWithSong[];       // Songs that haven't (for "all" mode)
  suggestedSongs: ScoreWithSong[];       // Smart recommendations (for "count" mode)
  matchingCharts: ChartInfo[];           // All charts matching criteria
}
```

### Proximity Scoring System

For sorting "remaining" and "suggestions" by how close the user is to achieving the goal:

```typescript
function calculateProximityScore(
  score: ScoreWithSong,
  targetType: 'lamp' | 'grade' | 'flare' | 'score',
  targetValue: string | number
): number {
  // Returns 0-100 where 100 = already achieved, 0 = far away
  
  if (targetType === 'lamp') {
    const lampOrder = ['mfc', 'pfc', 'gfc', 'fc', 'life4', 'clear', 'fail', null];
    const currentIndex = lampOrder.indexOf(score.halo?.toLowerCase() ?? null);
    const targetIndex = lampOrder.indexOf(targetValue as string);
    // Calculate distance
  }
  
  if (targetType === 'grade') {
    // Compare current rank to target rank
  }
  
  if (targetType === 'flare') {
    // Compare current flare level to target
  }
  
  if (targetType === 'score') {
    // Percentage of target achieved
  }
}
```

### Handling "No Score" Charts

For "all" mode goals, we need to include charts the user hasn't played yet:

1. Query `musicdb` for all charts matching criteria
2. Left join with `user_scores` to find unplayed charts
3. Show unplayed charts at the bottom of "Remaining" with a distinct visual treatment

```text
Remaining (24)

[Songs with scores - closest first]
Song A - GFC - 990,000
Song B - FC - 985,000
...

[Not yet played]
Song X - No score
Song Y - No score
```

---

## Visual Enhancements

### Progress Indicators on Remaining Songs

Show how close each song is to the goal:

```text
+----------------------------------+
| [14] SONG NAME                   |
| 985,000 [IX]          GFC  AAA   |
| [===------] 1 step from PFC     |  <- Mini progress hint
+----------------------------------+
```

### Celebration State

When a goal reaches 100%:
- Show confetti animation on first view
- "Remaining" tab shows empty state with celebration message
- Option to archive/delete the completed goal

### Empty States

**No scores uploaded yet:**
"Upload scores to start tracking progress toward this goal"

**Count goal with 0/X:**
"Start playing! Here are some songs to try first..."

---

## Navigation Flow

```text
Home (Goal Cards)
    |
    +-- Tap Goal Card
    |
    v
Goal Detail Page
    |
    +-- Tab: Completed / Remaining (or Suggestions)
    |
    +-- Tap Song Card (future: song detail page)
    |
    +-- Edit goal (...)  
    |
    +-- Delete goal (...)
```

---

## Implementation Order

1. **Create GoalDetail page** with basic layout and goal card display
2. **Extend useGoalProgress** to return song arrays (completed, remaining)
3. **Build CompletedSongsList** using existing SongCard component
4. **Build RemainingSongsList** with proximity sorting for "all" mode
5. **Build SuggestionsList** with recommendation logic for "count" mode
6. **Add route** to App.tsx
7. **Make GoalCard clickable** to navigate to detail page
8. **Add proximity indicator** visual treatment on remaining songs
9. **Handle unplayed charts** from musicdb for complete "all" goals

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Goal 100% complete | Show celebration, empty "remaining" tab |
| No scores matching criteria | Show message to upload/play songs |
| Count goal achieved early | Show "Goal complete!" but user can keep going |
| Criteria returns 0 charts | Show error state, suggest editing goal |
| Very large remaining list | Paginate or lazy load (e.g., 50 at a time) |

---

## Data Requirements

To show unplayed charts in "remaining" for "all" mode goals, we need:

1. **All charts from musicdb** that match the goal's criteria
2. **User's scores** for those charts
3. **Left join** to identify gaps

This may require a database query like:
```sql
SELECT m.*, us.score, us.halo, us.flare, us.rank
FROM musicdb m
LEFT JOIN user_scores us 
  ON us.musicdb_id = m.id 
  AND us.user_id = $user_id
WHERE m.difficulty_level = 14  -- example criteria
```

---

## Summary

The Goal Detail Page is the core engagement loop for the goals feature. By intelligently adapting to "all" vs "count" modes, sorting by proximity to goal, and providing smart recommendations, we create an actionable experience that helps players know exactly what to work on next.

