
# Plan: Fix Edi's Recommendation Variety ✅ IMPLEMENTED

## Problem
Charts are sorted deterministically (by difficulty, then title) so the AI sees the same ordered list every request. This causes repetitive recommendations.

## Solution: Two-Pronged Approach

### 1. ✅ Shuffle Charts Within Each Difficulty Level
Charts within each difficulty level are now randomized using Fisher-Yates shuffle before building the system prompt.

### 2. ✅ Add Random Session Seed
A random "SESSION VARIETY SEED" (1-1000) is now included in every request to encourage the AI to vary starting points.

---

## Changes Made

**File: `supabase/functions/edi-chat/index.ts`**

- Added `shuffleArray<T>()` helper function (Fisher-Yates shuffle)
- Modified chart sorting to group by max difficulty level, then shuffle within each group
- Added SESSION VARIETY SEED to the VARIETY REQUIREMENT section of the prompt
- Added instruction that "chart list order is randomized each session"

---

## Expected Outcome
- Each conversation surfaces different songs from the catalog
- The AI explores beyond the alphabetically-first songs at each level
- Recommendations feel fresh and varied
