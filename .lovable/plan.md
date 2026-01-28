
# Plan: Progressive Disclosure Goal Creation UI

## Problem Analysis
The current goal creation UI presents all options simultaneously, which is overwhelming and non-intuitive. Users struggle to understand the relationship between:
- Target (what to achieve)
- Criteria (which charts)
- Mode (all vs count)

## Goal Pattern Analysis
Based on the user's examples:

| Goal | Target | Criteria | Mode |
|------|--------|----------|------|
| PFC all 13's | PFC | Level = 13 | All |
| Pass 3 17's with score ≥ 950k | Clear | Level = 17, Score ≥ 950000 | Count: 3 |
| Pass 10 15's with flare ex | Clear | Level = 15, Flare = EX | Count: 10 |
| AAA 10 songs | AAA | (none) | Count: 10 |

**Possible combinations:**
- 7 Lamp targets (MFC, PFC, GFC, FC, LIFE4, Clear, Fail)
- 10 Grade targets (AAA through E)
- 10 Flare targets (EX through I)
- Score threshold target
- 9 Criteria types (Level, Difficulty, Grade, Lamp, Flare, Score, Title, Version, Era)
- 2 Modes (All, Count)

## Solution: Step-by-Step Wizard Flow

Replace the single long form with a collapsible stepper that guides users through 3 clear steps.

### Step 1: "What do you want to achieve?"
- Single question with clear options
- Categories: Lamp | Grade | Flare | Score
- Selecting expands to show sub-options
- Collapses when complete, showing summary

### Step 2: "On which charts?" (Optional)
- Shows only after Step 1 is complete
- Starts collapsed with "Any chart" default
- Expand to add filter rules using existing FilterRuleRow
- Uses existing filter UI components

### Step 3: "How many?"
- Shows only after Step 1 is complete
- Simple toggle: "All matching" vs "A specific number"
- Count input only appears when "specific number" selected

### Live Preview
- Stays at top, updates in real-time
- Shows auto-generated goal name that updates as user progresses

## UI Structure

```text
+----------------------------------+
|    [X]    New Goal    [...]     |
+----------------------------------+
|                                  |
|  +----------------------------+  |
|  | Preview                    |  |
|  | [PFC badge]                |  |
|  | PFC all 14s                |  |
|  | 0/47 completed             |  |
|  | [===--------] progress     |  |
|  +----------------------------+  |
|                                  |
|  Step 1: What do you want?       |
|  +----------------------------+  |
|  | [✓] PFC                    |  |  <- Collapsed summary
|  +----------------------------+  |
|                                  |
|  Step 2: Which charts?           |
|  +----------------------------+  |  <- Expanded (current step)
|  | Level is 14                |  |
|  |     [DELETE]               |  |
|  | [--- Add criteria ---]     |  |
|  +----------------------------+  |
|                                  |
|  Step 3: How many?               |
|  +----------------------------+  |
|  | ( ) All matching           |  |  <- Radio buttons
|  | (•) Specific number: [10]  |  |
|  +----------------------------+  |
|                                  |
|  Optional: Custom name           |
|  [PFC all 14s_____________]      |
|                                  |
|  [      Save Goal        ]       |
+----------------------------------+
```

## Implementation Steps

### 1. Create GoalStepCard component
**New file:** `src/components/goals/GoalStepCard.tsx`

A collapsible card for each step with:
- Step number indicator
- Title and optional summary when collapsed
- Expand/collapse functionality
- Completion state styling

### 2. Refactor CreateGoalSheet with stepper logic
**File:** `src/components/goals/CreateGoalSheet.tsx`

Changes:
- Add `currentStep` state to track which step is expanded
- Wrap sections in GoalStepCard components
- Step 1 (Target) auto-expands first, collapses when target selected
- Step 2 (Criteria) appears after Step 1, uses existing FilterRuleRow
- Step 3 (Mode) appears after Step 1
- Steps auto-advance as user completes each one

### 3. Simplify TargetSelector for step context
**File:** `src/components/goals/TargetSelector.tsx`

Changes:
- Add collapsible category headers (Lamp, Grade, Flare)
- When a target is selected, show collapsed summary view
- Clicking summary re-expands for editing

### 4. Add "Clear/Pass" to lamp targets
The user's examples include "Pass X songs" goals. Add "Clear" option to lamp targets since "Pass" = Clear in DDR terminology.

### 5. Update auto-naming for all scenarios
**File:** `src/components/goals/CreateGoalSheet.tsx`

Enhanced name generation covering all patterns:
- "PFC all 14s" (lamp + level criteria)
- "Clear 3 17s with score ≥ 950k" (lamp + multiple criteria + count)
- "AAA 10 songs" (grade + count)
- "Flare EX all Expert songs" (flare + difficulty criteria)

## Component Hierarchy

```text
CreateGoalSheet
├── GoalPreviewCard (live preview)
├── GoalStepCard (Step 1: Target)
│   └── TargetSelector
├── GoalStepCard (Step 2: Criteria - optional)
│   ├── FilterRuleRow[] (reused from filter system)
│   ├── RuleConnectorChip (AND/OR between rules)
│   └── Add rule button
├── GoalStepCard (Step 3: Mode)
│   └── GoalModeToggle
├── Optional name input
└── Save button
```

## Technical Details

### State Management
```typescript
// Current step: 1 = target, 2 = criteria, 3 = mode
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Track completion for visual feedback
const isStep1Complete = targetType && targetValue;
const isStep2Complete = true; // Always complete (optional)
const isStep3Complete = true; // Always has default
```

### Auto-Advance Logic
- When Step 1 target is selected: advance to Step 2 (or 3 if user skips)
- Steps remain clickable to go back and edit
- Save button enables when Step 1 is complete

### Data Flow
Target + Criteria + Mode data all persists to the same `user_goals` table structure - no database changes needed.

## Visual Design Notes
- Steps use the existing card styling (`rounded-[10px]`, `bg-[#262937]`)
- Collapsed steps show a checkmark and summary text
- Expanded step has subtle highlight border
- Smooth height animations on expand/collapse using existing Collapsible component
