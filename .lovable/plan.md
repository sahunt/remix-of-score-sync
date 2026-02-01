

# Add Goal Editing Functionality

## Overview

This plan adds the ability to edit existing goals by reusing the existing `CreateGoalSheet` component with minimal modifications. The edit flow will be nearly identical to the creation flow, with only the CTA button text changing from "Save Goal" to "Update Goal".

## UX Considerations & Best Practices

### 1. **Reuse Existing UI Pattern**
- Users are already familiar with the goal creation flow
- Using the same sheet ensures consistency and reduces cognitive load
- No new patterns to learn - edit looks exactly like create

### 2. **Edit Icon Placement**
- Add edit icon to the LEFT of the delete icon (following action grouping convention)
- Both actions are secondary actions, grouped together in the header
- Edit is less destructive than delete, so it comes first (left-to-right reading order)

### 3. **Form Pre-population**
- When editing, the sheet opens with ALL existing goal values pre-filled
- User can modify any field - name, target type, target value, criteria, goal mode
- Preview card updates in real-time (existing behavior)

### 4. **Clear Feedback on Update**
- CTA button changes to "Update Goal" (vs "Save Goal" for create)
- Success toast confirms "Goal updated!" 
- Sheet closes and user returns to goal detail view with updated data

### 5. **Cache Invalidation**
- After update, invalidate both goals list AND the individual goal query
- This ensures Home page cards AND the Goal Detail page both reflect changes immediately

## Technical Approach

### Component Changes

**1. `CreateGoalSheet.tsx` → Modified to support edit mode**

Add optional props to receive an existing goal for editing:

```typescript
interface CreateGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // New: optional goal to edit
  editingGoal?: Goal | null;
}
```

Key modifications:
- Accept `editingGoal` prop with existing goal data
- Initialize form state from `editingGoal` values when provided
- Change header text: "New Goal" → "Edit Goal"
- Change CTA text: "Save Goal" → "Update Goal"
- Call `updateGoal.mutateAsync()` instead of `createGoal.mutateAsync()` when editing

**2. `GoalDetailHeader.tsx` → Add edit button**

Add edit icon button to the left of delete:

```typescript
interface GoalDetailHeaderProps {
  onBack: () => void;
  onEdit?: () => void;  // New
  onDelete?: () => void;
  isDeleting?: boolean;
}
```

Render order: back button | flex-1 title | edit button | delete button

**3. `GoalDetail.tsx` → Wire up edit sheet**

- Add state for edit sheet open/close
- Pass `goal` data to `CreateGoalSheet` when editing
- After successful update, sheet closes and goal data refetches automatically

**4. `useGoals.ts` → Fix updateGoal mutation**

The current `updateGoal` mutation is missing `score_floor` in the update payload. This needs to be added for complete goal updates:

```typescript
.update({
  // ... existing fields
  score_floor: updates.score_floor,  // Add this
})
```

Also need to invalidate the individual goal query key:

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
  queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
},
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/goals/CreateGoalSheet.tsx` | Add `editingGoal` prop, conditional form initialization, update mode handling |
| `src/components/goals/GoalDetailHeader.tsx` | Add `onEdit` prop and edit icon button |
| `src/pages/GoalDetail.tsx` | Add edit sheet state, pass goal to sheet |
| `src/hooks/useGoals.ts` | Add `score_floor` to update payload, invalidate individual goal query |

## Implementation Details

### CreateGoalSheet Modifications

```typescript
// Props interface update
interface CreateGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal?: Goal | null;
}

// Inside component
const isEditMode = Boolean(editingGoal);

// Form reset logic - use editing goal values when provided
useEffect(() => {
  if (open) {
    if (editingGoal) {
      // Edit mode: populate from existing goal
      setName(editingGoal.name);
      setTargetType(editingGoal.target_type);
      setTargetValue(editingGoal.target_value);
      // ... etc
    } else {
      // Create mode: reset to defaults
      setName('');
      setTargetType(null);
      // ... etc
    }
  }
}, [open, editingGoal]);

// Handle save - call different mutation based on mode
const handleSave = async () => {
  if (isEditMode) {
    await updateGoal.mutateAsync({
      id: editingGoal.id,
      name: displayName,
      target_type: targetType,
      // ... all fields
    });
    toast({ title: "Goal updated!" });
  } else {
    await createGoal.mutateAsync({ ... });
    toast({ title: "Goal created!" });
  }
};

// UI conditionals
<h2>{isEditMode ? 'Edit Goal' : 'New Goal'}</h2>
<Button>{isEditMode ? 'Update Goal' : 'Save Goal'}</Button>
```

### GoalDetailHeader Edit Button

```typescript
// Add edit button before delete
{onEdit && (
  <Button
    variant="ghost"
    size="icon"
    onClick={onEdit}
    className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
  >
    <Icon name="edit" size={24} />
  </Button>
)}
{onDelete && ( /* existing delete button */ )}
```

### GoalDetail Page Integration

```typescript
// State
const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

// Header
<GoalDetailHeader 
  onBack={handleBack}
  onEdit={() => setIsEditSheetOpen(true)}  // New
  onDelete={handleDelete}
  isDeleting={isDeleting}
/>

// Sheet (add at bottom of page)
<CreateGoalSheet
  open={isEditSheetOpen}
  onOpenChange={setIsEditSheetOpen}
  editingGoal={goal}
/>
```

## Data Flow After Update

```text
User clicks "Update Goal"
    ↓
updateGoal.mutateAsync() called
    ↓
Database updated
    ↓
onSuccess invalidates:
  - ['goals', user.id] → Home page cards refresh
  - ['goal', goalId] → Current goal detail refreshes
    ↓
Sheet closes, user sees updated goal
```

## Testing Checklist

1. Tap edit icon on goal detail page - verify sheet opens with all values pre-populated
2. Verify header shows "Edit Goal" not "New Goal"
3. Verify CTA shows "Update Goal" not "Save Goal"
4. Modify goal name and save - verify toast shows "Goal updated!"
5. Verify goal detail page shows new name immediately
6. Navigate to Home - verify goal card shows updated name
7. Edit goal to change target type - verify preview card updates in real-time
8. Cancel edit (tap X or outside) - verify no changes saved
9. Create a new goal - verify form still resets to defaults (not old edit values)

