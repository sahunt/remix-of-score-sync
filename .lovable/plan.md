

# Dynamic Score Floor for Average Goals Progress Bar

## Summary
Store the user's lowest matching score at goal creation time as a fixed floor for the progress bar. This makes progress visualization personally meaningful - showing improvement from where they started rather than an arbitrary 0-1,000,000 scale.

Additionally, fix the GoalBadge to show "avg." instead of "+" for average score goals.

---

## Database Changes

Add a new column `score_floor` to the `user_goals` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `score_floor` | integer | `NULL` | The user's lowest score among matching charts at goal creation (only for average mode) |

```sql
ALTER TABLE public.user_goals 
ADD COLUMN score_floor integer DEFAULT NULL;
```

---

## How the Floor Works

### At Goal Creation Time
When creating an average score goal:
1. Filter user scores by the goal's criteria rules
2. Find the minimum score among matching played songs
3. Store this as `score_floor` (fixed, won't change even if user improves)

Example:
- User creates "990,000 avg. on 14s" goal
- Their lowest 14 score is currently 952,340
- `score_floor` is stored as 952,340
- Progress bar range: 952,340 → 990,000

### Progress Bar Calculation
```text
Current avg: 975,000 | Target: 990,000 | Floor: 952,340

Range without floor (0-990,000):
[████████████████████████████████████████████████░░] 98%  ← Looks almost done

Range with floor (952,340-990,000):
[██████████████████████████████░░░░░░░░░░░░░░░░░░░░] 60%  ← Shows real progress
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useGoals.ts` | Add `score_floor` to Goal interface and CRUD |
| `src/hooks/useGoalProgress.ts` | Add `score_floor` to Goal type |
| `src/components/goals/CreateGoalSheet.tsx` | Calculate and save `score_floor` on creation |
| `src/components/home/GoalCard.tsx` | Use floor in progress bar calculation |
| `src/pages/GoalDetail.tsx` | Pass `score_floor` to GoalCard |
| `src/components/home/GoalBadge.tsx` | Add `scoreMode` prop, show "avg." instead of "+" |
| `src/components/goals/GoalPreviewCard.tsx` | Pass `scoreMode` to GoalBadge, calculate preview progress with floor |
| Database migration | Add `score_floor` column |

---

## Implementation Details

### 1. Calculate Floor at Creation

In `CreateGoalSheet.tsx`, when creating an average score goal:

```typescript
// Calculate score floor from matching scores
const calculateScoreFloor = (): number | null => {
  if (targetType !== 'score' || scoreMode !== 'average') return null;
  
  const playedScores = filteredScores
    .filter(s => s.score !== null)
    .map(s => s.score!);
  
  if (playedScores.length === 0) return null;
  return Math.min(...playedScores);
};
```

### 2. Update GoalBadge

Add `scoreMode` prop to display correct suffix:

```typescript
interface GoalBadgeProps {
  targetType: GoalTargetType;
  targetValue: string;
  className?: string;
  scoreMode?: 'target' | 'average';  // NEW
}

// In score section:
if (targetType === 'score') {
  const formattedScore = parseInt(targetValue, 10).toLocaleString();
  const suffix = scoreMode === 'average' ? ' avg.' : '+';
  return (
    <div className={...}>
      {formattedScore}{suffix}
    </div>
  );
}
```

### 3. Progress Bar with Floor

In `GoalCard.tsx` and `GoalDetail.tsx`:

```typescript
// For average score mode with floor
const calculateProgress = (current: number, target: number, floor: number | null) => {
  if (floor && floor > 0) {
    const adjustedCurrent = Math.max(current - floor, 0);
    const adjustedTarget = Math.max(target - floor, 1);
    return Math.min((adjustedCurrent / adjustedTarget) * 100, 100);
  }
  // Fallback to standard calculation
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
};
```

### 4. Propagate scoreMode to GoalBadge

Update these components to pass `scoreMode`:
- `GoalCard.tsx` → `GoalBadge` (already has scoreMode prop)
- `GoalPreviewCard.tsx` → `GoalBadge` (add scoreMode prop)
- `Home.tsx` → `GoalCard` (already passes it)
- `GoalDetail.tsx` → `GoalCard` (already passes it)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No played songs at creation | `score_floor` is NULL, use 0 as fallback |
| All songs above target already | Floor still stored, but progress shows 100% |
| User improves lowest score later | Floor stays fixed (captures starting point) |
| Target mode goals | `score_floor` stays NULL, not used |

---

## Visual Example

User creating "990,000 avg. on Expert 17s":
- 8 songs match the criteria
- Lowest score: 945,000
- Current average: 968,500

**Before (0-990,000 range):**
```
Progress: 98% [████████████████████████████████████████████████░░]
```

**After (945,000-990,000 range):**
```
Progress: 52% [██████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░]
```

The new visualization makes every 1,000-point improvement feel meaningful!

