
# Plan: Unify Goal Criteria with Filter UI

## Overview
Replace the current simplified goal criteria selector with the full filter rule builder UI used in the filter system. This gives users access to all filter options (Level, Difficulty, Grade, Lamp, Flare, Score, Title, Version, Era) when defining which charts count toward their goal.

## Current Problem
- The `GoalCriteriaSelector` only supports level selection
- Users need access to all filter options (difficulty names, scores, flares, etc.)
- The UI looks different from the established filter builder pattern

## Solution
Reuse the existing `FilterRuleRow` component directly in the goal creation flow, maintaining UI consistency and providing full filter capabilities.

## Implementation Steps

### 1. Update CreateGoalSheet to use filter rules
**File:** `src/components/goals/CreateGoalSheet.tsx`

Changes:
- Replace `selectedLevels` state with `criteriaRules: FilterRule[]` array
- Import `FilterRuleRow`, `RuleConnectorChip`, and filter types from the filter components
- Add "Add rule" dashed button (same pattern as CreateFilterSheet)
- Add match mode toggle when 2+ rules exist
- Update the auto-name generator to work with FilterRule format

### 2. Remove GoalCriteriaSelector component
**File:** `src/components/goals/GoalCriteriaSelector.tsx`

This component becomes unnecessary since we're using `FilterRuleRow` directly.

### 3. Update goal save logic
The `criteria_rules` already stores filter rules as JSON. Update the save handler to:
- Pass the full `FilterRule[]` array to the database
- Include `criteria_match_mode` from the toggle

### 4. Update auto-naming logic
Modify `generateName()` to parse filter rules for level information and build descriptive names like "PFC all 14-16s" or "AAA 10 Expert songs"

---

## Technical Details

### Data Flow
```text
User selects target (e.g., PFC)
         |
         v
User adds criteria rules using FilterRuleRow
  - Level is 14, 15, 16
  - Difficulty is Expert
         |
         v
Rules saved to user_goals.criteria_rules as JSON array
```

### Component Reuse
- `FilterRuleRow` - full filter card with type/operator dropdowns and value selectors
- `RuleConnectorChip` - AND/OR chip between rules
- `MatchModeToggle` - all/any toggle (when 2+ rules)
- Filter types and helpers from `filterTypes.ts`

### Auto-naming Examples
- Target: PFC, Criteria: [Level is 14-16] → "PFC all 14-16s"
- Target: AAA, Criteria: [Difficulty is Expert] → "AAA all Expert songs"
- Target: Flare IX, Criteria: [Level is 18, 19] → "IX all 18-19s"
- No criteria → "PFC all songs"
