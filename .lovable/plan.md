
# Fix Plan: EDI Skill Activation & Data Referencing

## Problem Summary

Looking at the edge function logs, I found the root cause:

```
2026-02-05T02:40:08Z INFO Active skills for this query: whoIAm, playerProfile
```

The **countingStats** skill is NOT activating even when it should be. The data (183 MFCs) is being calculated correctly in `totalStats`, but it **never reaches the AI prompt** because the skill's `shouldActivate()` pattern is too narrow.

## Root Causes

1. **Too-narrow keyword patterns** - The `countingStats` skill only matches `/how many|total|count|do i have/`. Questions like "tell me about my MFCs", "what are my stats", or "MFC count" won't trigger it.

2. **No fallback for stat-related queries** - If keywords don't match, Edi only gets `whoIAm` and `playerProfile`, leaving her blind to the actual stat numbers.

3. **Song catalog not activating for some song queries** - Similar issue with the catalog skill's patterns.

---

## Solution: Expand Skill Activation Patterns

### 1. Update `counting-stats.ts` shouldActivate()

**Current pattern:**
```typescript
return /how many|total|count|do i have/i.test(lower);
```

**Improved pattern (expand to catch more stat queries):**
```typescript
return /how many|total|count|do i have|mfc|pfc|gfc|fc|life4|clear|aaa|stats|score|played/i.test(lower);
```

This will activate the counting stats skill when users ask about:
- "how many MFCs" ✓ (already works)
- "tell me about my MFCs" ✓ (now works)
- "what are my stats" ✓ (now works)
- "MFC count" ✓ (now works)
- "AAAs I have" ✓ (now works)

### 2. Update `song-catalog.ts` shouldActivate()

**Current pattern:**
```typescript
return /recommend|suggest|practice|play|target|pfc|fc|mfc|gfc|songs?|chart|what.*should|give me|list|folder|\d+s\b/i.test(lower);
```

**Improved pattern (add more song query triggers):**
```typescript
return /recommend|suggest|practice|play|target|pfc|fc|mfc|gfc|songs?|chart|what.*should|give me|list|folder|\d+s\b|level|difficulty|clear|lamp|which|work on/i.test(lower);
```

### 3. Update `chart-patterns.ts` shouldActivate()

**Current pattern:**
```typescript
return /crossover|footswitch|jack|drill|stamina|pattern|technical|stream|speed|bpm/i.test(lower);
```

**Improved pattern:**
```typescript
return /crossover|footswitch|jack|drill|stamina|pattern|technical|stream|speed|bpm|fast|slow|notes|nps|hard part/i.test(lower);
```

### 4. Update `sdp-rules.ts` shouldActivate()

**Current pattern:**
```typescript
return /sdp|single digit|close to mfc|near mfc/i.test(lower);
```

**Improved pattern:**
```typescript
return /sdp|single digit|close to mfc|near mfc|almost mfc|999/i.test(lower);
```

### 5. Update `warmup-rules.ts` shouldActivate()

**Current pattern:**
```typescript
return /warmup|warm up|warm-up|prepare|injury|hurt|before playing|start.*session/i.test(lower);
```

**Improved pattern:**
```typescript
return /warmup|warm up|warm-up|prepare|injury|hurt|before playing|start.*session|stretch|safe|don't.*injur/i.test(lower);
```

---

## Implementation Steps

1. **Update each skill file's `shouldActivate()` function** with the expanded patterns above

2. **Re-deploy the edi-chat edge function**

3. **Test with various queries** to verify skills are activating correctly:
   - "How many MFCs do I have?" → should activate `countingStats`
   - "Tell me about my stats" → should activate `countingStats`
   - "What are my MFCs?" → should activate `countingStats`
   - "Recommend some 15s" → should activate `songCatalog`
   - "What songs have crossovers?" → should activate `chartPatterns` + `songCatalog`

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/edi-chat/skills/counting-stats.ts` | Expand `shouldActivate()` regex |
| `supabase/functions/edi-chat/skills/song-catalog.ts` | Expand `shouldActivate()` regex |
| `supabase/functions/edi-chat/skills/chart-patterns.ts` | Expand `shouldActivate()` regex |
| `supabase/functions/edi-chat/skills/sdp-rules.ts` | Expand `shouldActivate()` regex |
| `supabase/functions/edi-chat/skills/warmup-rules.ts` | Expand `shouldActivate()` regex |

### Expected Behavior After Fix

When user asks "How many MFCs do I have?":
- **Before:** Active skills: `whoIAm, playerProfile` (missing the data!)
- **After:** Active skills: `whoIAm, playerProfile, countingStats` (correct data included)

The counting stats section will now appear in the prompt with:
```
YOUR TOTALS (ALL DIFFICULTY LEVELS 1-19):
- MFCs: 183
- PFCs: 1600
...
```

---

## Verification

After deployment, check the logs for:
```
Active skills for this query: whoIAm, playerProfile, countingStats
```

This confirms the counting stats skill is now activating when it should.
