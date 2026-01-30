
# Fix Goal Detail Tabs and Sorting

## Summary
Fix the Goal Detail page to always show "Remaining" as the first tab (not "Suggestions"), and sort songs by their actual value from highest to lowest based on the goal's target type.

---

## Changes

### 1. Unify Tab Labels (`src/components/goals/GoalSongTabs.tsx`)

**Current behavior:** Tab label changes based on goal mode ("Suggestions" for count mode, "Remaining" for all mode)

**New behavior:** Always show "Remaining" tab label

```diff
- const isCountMode = goal.goal_mode === 'count';
- const firstTabLabel = isCountMode ? 'Suggestions' : 'Remaining';
- const firstTabCount = isCountMode ? suggestedSongs.length : remainingSongs.length;
+ const firstTabLabel = 'Remaining';
+ const firstTabCount = remainingSongs.length;
```

Also simplify the tab content to always render `RemainingSongsList`:

```diff
{activeTab === 'remaining' ? (
-  isCountMode ? (
-    <SuggestionsList ... />
-  ) : (
-    <RemainingSongsList ... />
-  )
+  <RemainingSongsList 
+    songs={remainingSongs} 
+    goal={goal}
+    isLoading={isLoading} 
+  />
) : (
  <CompletedSongsList ... />
)}
```

Remove the unused `SuggestionsList` import.

---

### 2. Update Sorting Logic (`src/hooks/useGoalProgress.ts`)

**Current behavior:** Sorts by "proximity score" (percentage toward goal)

**New behavior:** Sort by actual value, highest to lowest, based on target type:
- **Score goals:** Sort by `score` descending
- **Flare goals:** Sort by `flare` descending  
- **Lamp goals:** Sort by lamp hierarchy (MFC > PFC > GFC > FC > etc.)
- **Grade goals:** Sort by grade hierarchy (AAA > AA+ > AA > etc.)

Replace the proximity-based sorting with value-based sorting:

```typescript
// Sort incomplete songs by their actual value (highest first)
const sortedIncomplete = [...incompleteSongs].sort((a, b) => {
  switch (goal.target_type) {
    case 'score': {
      // Highest score first, nulls last
      const scoreA = a.score ?? -1;
      const scoreB = b.score ?? -1;
      return scoreB - scoreA;
    }
    case 'flare': {
      // Highest flare first, nulls last
      const flareA = a.flare ?? -1;
      const flareB = b.flare ?? -1;
      return flareB - flareA;
    }
    case 'lamp': {
      // Best lamp first (lower index = better)
      const indexA = a.halo ? LAMP_ORDER.indexOf(a.halo.toLowerCase() as any) : LAMP_ORDER.length;
      const indexB = b.halo ? LAMP_ORDER.indexOf(b.halo.toLowerCase() as any) : LAMP_ORDER.length;
      return indexA - indexB;
    }
    case 'grade': {
      // Best grade first (lower index = better)
      const indexA = a.rank ? GRADE_ORDER.indexOf(a.rank.toUpperCase() as any) : GRADE_ORDER.length;
      const indexB = b.rank ? GRADE_ORDER.indexOf(b.rank.toUpperCase() as any) : GRADE_ORDER.length;
      return indexA - indexB;
    }
    default:
      return 0;
  }
});
```

Also update `remainingSongs` to be populated for all goal modes:

```diff
- const remainingSongs = goal.goal_mode === 'all' ? sortedIncomplete : [];
- const suggestedSongs = goal.goal_mode === 'count' ? sortedIncomplete.slice(0, 20) : [];
+ const remainingSongs = sortedIncomplete;
+ const suggestedSongs = []; // No longer used
```

---

## Result

After these changes:
- The Goal Detail page will always show "Remaining" and "Completed" tabs
- Remaining songs will be sorted by their actual achievement value (highest score/flare/lamp/grade first)
- Songs closest to completing the goal will naturally appear at the top since they have the highest current values

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/goals/GoalSongTabs.tsx` | Hardcode "Remaining" label, remove conditional rendering |
| `src/hooks/useGoalProgress.ts` | Replace proximity sorting with value-based sorting |
