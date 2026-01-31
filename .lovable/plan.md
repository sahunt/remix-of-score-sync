
# Add Score Mode Toggle (Target vs Average) to Goals

## Summary
Add a toggle to the score section of the goal creation/edit UI that switches between two modes:
- **Target**: Works as today - songs must reach that score or higher
- **Average**: Goal tracks average score across all matching songs

The toggle will use the same visual style and animation as the existing `MatchModeToggle` component.

---

## Database Changes

Add a new column `score_mode` to the `user_goals` table to store whether a score goal uses "target" or "average" mode.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `score_mode` | text | `'target'` | Either `'target'` or `'average'` |

SQL Migration:
```sql
ALTER TABLE public.user_goals 
ADD COLUMN score_mode text NOT NULL DEFAULT 'target';
```

---

## UI Changes

### 1. Create `ScoreModeToggle` Component

New file: `src/components/goals/ScoreModeToggle.tsx`

A reusable toggle matching the `MatchModeToggle` styling:
- Background: `bg-[#262937]` with `rounded-[10px]` and `p-1.5`
- Sliding indicator: `bg-primary` with smooth 300ms transition
- Two buttons: "Target" and "Average"

```text
┌─────────────────────────────────────┐
│  [ Target ]    [ Average ]          │  ← Sliding indicator behind selected
└─────────────────────────────────────┘
```

### 2. Update `TargetSelector` Score Panel

Modify `src/components/goals/TargetSelector.tsx`:

When `selectedCategory === 'score'`, add the `ScoreModeToggle` above the existing score input/slider:

```text
┌───────────────────────────────────────────┐
│  [ Target ]         [ Average ]           │  ← New toggle
├───────────────────────────────────────────┤
│              950,000                      │  ← Existing input
│  ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━          │  ← Existing slider
└───────────────────────────────────────────┘
```

Props change:
- Add `scoreMode?: 'target' | 'average'` prop
- Add `onScoreModeChange?: (mode: 'target' | 'average') => void` prop

### 3. Update `CreateGoalSheet`

Modify `src/components/goals/CreateGoalSheet.tsx`:

- Add state: `const [scoreMode, setScoreMode] = useState<'target' | 'average'>('target');`
- Pass `scoreMode` and `onScoreModeChange` to `TargetSelector`
- Reset `scoreMode` to `'target'` when target type changes away from score
- Include `score_mode` in the `createGoal.mutateAsync()` call

---

## Logic Changes

### 1. Update `Goal` Type

Modify `src/hooks/useGoalProgress.ts`:

Add `score_mode` field to the `Goal` interface:
```typescript
export interface Goal {
  id: string;
  name: string;
  target_type: 'lamp' | 'grade' | 'flare' | 'score';
  target_value: string;
  criteria_rules: any[];
  criteria_match_mode: 'all' | 'any';
  goal_mode: 'all' | 'count';
  goal_count?: number | null;
  score_mode?: 'target' | 'average';  // NEW
}
```

### 2. Update `meetsTarget` Function

For score goals with `score_mode === 'average'`:
- Individual songs don't "meet" or "not meet" the target
- Progress is based on collective average, not individual song scores
- Return `true` for all played songs (they contribute to average)

### 3. Update `useGoalProgress` Hook

Add average score calculation:
```typescript
// For average mode, calculate current average
const calculateAverageScore = (scores: ScoreWithSong[]): number => {
  const playedWithScores = scores.filter(s => s.score !== null && !s.isUnplayed);
  if (playedWithScores.length === 0) return 0;
  const sum = playedWithScores.reduce((acc, s) => acc + (s.score ?? 0), 0);
  return Math.round(sum / playedWithScores.length / 10) * 10;
};
```

For average mode goals:
- `current` = current average score
- `total` = target average score
- `completedSongs` = empty (doesn't apply)
- `remainingSongs` = all matching songs sorted by score descending

### 4. Update `useGoals` Hook

Modify `src/hooks/useGoals.ts`:

- Add `score_mode` to `GoalRow` interface
- Add `score_mode` to `mapRowToGoal` function
- Include `score_mode` in create and update mutations

---

## Progress Display for Average Mode

On the Goal Detail page and Goal Card:
- Instead of "23/47 completed", show "Avg. 985,000 / 990,000 target"
- Progress bar fills based on `currentAvg / targetAvg` ratio
- Songs list shows all matching songs sorted by score (highest first)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/goals/ScoreModeToggle.tsx` | NEW - Toggle component |
| `src/components/goals/TargetSelector.tsx` | Add toggle when score category selected |
| `src/components/goals/CreateGoalSheet.tsx` | Add scoreMode state, pass to TargetSelector |
| `src/hooks/useGoalProgress.ts` | Update Goal type, add average calculation |
| `src/hooks/useGoals.ts` | Add score_mode to CRUD operations |
| Database migration | Add `score_mode` column |

---

## Technical Details

**Average Score Calculation (matching Scores page):**
```typescript
const playedWithScores = matchingScores.filter(s => s.score !== null);
const avgScore = playedWithScores.length > 0
  ? Math.round(playedWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / playedWithScores.length / 10) * 10
  : 0;
```

This rounds to the nearest 10 to align with DDR's scoring system.
