
# Plan: Fix Edi's Recommendation Variety

## Problem
Charts are sorted deterministically (by difficulty, then title) so the AI sees the same ordered list every request. This causes repetitive recommendations.

## Solution: Two-Pronged Approach

### 1. Shuffle Charts Within Each Difficulty Level
Before building the system prompt, randomize the order of charts within each difficulty level. This ensures:
- Different charts appear "first" in each request
- AI naturally discovers different songs when scanning the catalog

### 2. Add Random Session Seed
Generate a random number (1-1000) each request and include it in the prompt to encourage the AI to vary starting points.

---

## Technical Changes

**File: `supabase/functions/edi-chat/index.ts`**

### A. Add Shuffle Helper Function
```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### B. Modify `buildSystemPrompt` to Shuffle Charts per Level
Currently, charts are sorted by difficulty then title (deterministic). Change to:
1. Group charts by difficulty level
2. Shuffle within each group
3. Rebuild the list with shuffled groups

### C. Add Session Seed to Prompt
Generate `Math.floor(Math.random() * 1000) + 1` and add to the VARIETY REQUIREMENT section:

```
SESSION VARIETY SEED: [random number]
Use this seed to vary your starting point when scanning the catalog.
Don't always recommend the same songs - surprise the player!
```

---

## Expected Outcome
- Each conversation surfaces different songs from the catalog
- The AI explores beyond the alphabetically-first songs at each level
- Recommendations feel fresh and varied
