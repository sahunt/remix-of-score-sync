

# Fix Average Score Goals on Home Screen + Add Shimmer Loading

## Problems Identified

### 1. Average Score Goals Show "AVG. 0"
The Home page uses the server-side RPC `calculate_goal_progress` which only returns completed counts, not average scores. The code explicitly hardcodes `current = 0` for average mode goals because "not supported by RPC yet."

**Root cause in `Home.tsx`:**
```typescript
const current = isAverageMode
  ? 0 // Average mode needs special handling - not supported by RPC yet
  : (progress?.completed ?? 0);
```

Meanwhile, `GoalDetail.tsx` calculates averages correctly using client-side logic via `useGoalProgress`.

### 2. No Loading Indicator for Progress Values
When navigating to Home, goal cards immediately show values like "0/253" before the RPC returns, then update without any visual transition. There's no shimmer to indicate loading state.

---

## Solution

### Part 1: Add Average Calculation to RPC

Extend the `calculate_goal_progress` PostgreSQL function to return `average_score` alongside the existing counts. This enables the Home page to display accurate average progress without client-side score fetching.

**New RPC return type:**
| Column | Type | Purpose |
|--------|------|---------|
| completed_count | bigint | Existing - songs meeting target |
| total_count | bigint | Existing - total matching charts |
| **average_score** | bigint | **New** - rounded average of all matching scores |

**SQL changes:**
- Add `average_score` to the return table
- Calculate `ROUND(AVG(us.score) / 10) * 10` for matching scores
- Return this value regardless of target_type (null if no scores)

### Part 2: Update Home Page to Use Average

Modify `GoalCardWithProgress` in `Home.tsx` to:
1. Use the new `average_score` from RPC for average mode goals
2. Pass `isLoading` state to `GoalCard`

### Part 3: Add Shimmer to GoalCard

Add a `isLoading` prop to `GoalCard` that shows:
- A shimmer animation on the progress text ("AVG. -- / --")
- A pulsing/shimmer effect on the progress bar

The shimmer should use Tailwind's existing `animate-pulse` class or a custom shimmer animation for a more polished look.

---

## Technical Implementation

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(
  p_user_id UUID,
  p_level_values INTEGER[] DEFAULT NULL,
  p_level_operator TEXT DEFAULT 'is',
  p_difficulty_values TEXT[] DEFAULT NULL,
  p_difficulty_operator TEXT DEFAULT 'is',
  p_target_type TEXT DEFAULT 'lamp',
  p_target_value TEXT DEFAULT 'clear'
)
RETURNS TABLE(
  completed_count BIGINT,
  total_count BIGINT,
  average_score BIGINT  -- NEW
) AS $$
-- ... existing logic ...
-- Add: SELECT COALESCE((ROUND(AVG(us.score) / 10) * 10)::BIGINT, 0) INTO average_score
$$ LANGUAGE plpgsql;
```

### Hook Update (`useServerGoalProgress.ts`)

```typescript
interface GoalProgressResult {
  completed: number;
  total: number;
  averageScore: number;  // NEW
}

// Update query to extract average_score from RPC result
return {
  completed: Number(result?.completed_count ?? 0),
  total: Number(result?.total_count ?? 0),
  averageScore: Number(result?.average_score ?? 0),  // NEW
};
```

### Home.tsx Changes

```typescript
function GoalCardWithProgress({ goal }: { goal: Goal }) {
  const { data: progress, isLoading } = useServerGoalProgress(...);
  
  const isAverageMode = goal.target_type === 'score' && goal.score_mode === 'average';
  
  const current = isAverageMode
    ? (progress?.averageScore ?? 0)  // USE RPC VALUE
    : goal.goal_mode === 'count' 
      ? Math.min(progress?.completed ?? 0, goal.goal_count ?? 0)
      : (progress?.completed ?? 0);
  
  const total = isAverageMode
    ? parseInt(goal.target_value, 10)
    : goal.goal_mode === 'count' 
      ? (goal.goal_count ?? 0) 
      : (progress?.total ?? 0);

  return (
    <GoalCard
      id={goal.id}
      title={goal.name}
      // ... other props
      current={current}
      total={total}
      isLoading={isLoading}  // PASS LOADING STATE
    />
  );
}
```

### GoalCard.tsx Shimmer

```typescript
interface GoalCardProps {
  // ... existing props
  isLoading?: boolean;  // NEW
}

export function GoalCard({ 
  // ... 
  isLoading = false,
}: GoalCardProps) {
  
  return (
    <div className="card-base w-full ...">
      {/* Badge */}
      <GoalBadge ... />
      
      {/* Title */}
      <h3 className="...">{title}</h3>
      
      {/* Progress text - with shimmer when loading */}
      {isLoading ? (
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      ) : (
        <p className="text-xs text-muted-foreground ...">
          {isAverageMode 
            ? `Avg. ${formatScore(current)} / ${formatScore(total)}`
            : `${current}/${total} completed`
          }
        </p>
      )}
      
      {/* Progress bar - shimmer when loading */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full bg-gradient-to-r from-muted via-muted-foreground/20 to-muted animate-shimmer" />
        ) : (
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
```

### Tailwind Shimmer Animation

Add to `tailwind.config.ts`:

```typescript
keyframes: {
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
},
animation: {
  shimmer: 'shimmer 1.5s infinite',
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Migration** | Extend `calculate_goal_progress` to return `average_score` |
| `src/hooks/useServerGoalProgress.ts` | Add `averageScore` to result type and parsing |
| `src/pages/Home.tsx` | Use `averageScore` for average mode, pass `isLoading` |
| `src/components/home/GoalCard.tsx` | Add `isLoading` prop with shimmer UI |
| `tailwind.config.ts` | Add shimmer keyframe animation |

---

## Data Flow After Fix

```text
Home page loads
    ↓
RPC: calculate_goal_progress
    ↓
Returns: { completed_count, total_count, average_score }
    ↓
GoalCard shows shimmer while isLoading=true
    ↓
Data arrives → smooth transition to real values
    ↓
Average mode: displays "AVG. 999,200 / 999,910"
```

---

## Testing Checklist

1. Create a score-based goal with "Average" mode targeting 999,910
2. Navigate to Home - verify shimmer shows while loading
3. Verify average score displays correctly (should match GoalDetail page)
4. Navigate to GoalDetail - verify progress matches Home
5. Edit goal and change target - verify Home updates immediately
6. Test lamp/grade/flare goals still work correctly with shimmer

