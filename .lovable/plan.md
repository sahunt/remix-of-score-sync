
# Investigation Summary: Songs Not Displaying on Scores Page

## Problem
- Stats show correct counts (237 total Level 14 songs)
- Song cards display "No scores found"
- Data exists in database but isn't rendering

## Root Cause Identified

**Primary Issue: Stale Cached JavaScript**

The network request captured from your browser shows:
```
musicdb(name,artist)
```

But the current code in Scores.tsx (lines 236-241) includes:
```
musicdb(name, artist, eamuse_id, song_id)
```

This indicates your browser is running an **older cached version** of the JavaScript that doesn't include the recent query updates. The stats work because they use `difficulty_level` directly from `user_scores`, but the song card rendering likely depends on the full `musicdb` data including `song_id` for proper display.

**Secondary Issue: Inconsistent Queries Across Files**

Several files still use incomplete musicdb queries:
- `Home.tsx` line 109: `musicdb(name, artist)` - missing `eamuse_id, song_id`  
- `CreateGoalSheet.tsx` line 115: `musicdb(name, artist)` - missing fields

While `GoalDetail.tsx` correctly includes all 4 fields.

## Recommended Fix

### Step 1: Force Browser Cache Refresh
Try a hard refresh in your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) to load the latest JavaScript.

### Step 2: Update Inconsistent Queries
Update the following files to include all musicdb fields:

**Home.tsx** (line 109):
```typescript
musicdb(name, artist, eamuse_id, song_id)
```

**CreateGoalSheet.tsx** (line 115):
```typescript
musicdb(name, artist, eamuse_id, song_id)
```

### Step 3: Update TypeScript Interfaces
Ensure all `ScoreWithSong` and similar interfaces include the full musicdb shape:
```typescript
musicdb: {
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
} | null;
```

## Technical Details

**Database Status:**
- All 2,328 SP scores have `musicdb_id` set correctly
- All 237 Level 14 scores have valid `musicdb` relationships
- Data joins work correctly at the database level

**Files Requiring Updates:**
1. `src/pages/Home.tsx` - Update query to include all musicdb fields
2. `src/components/goals/CreateGoalSheet.tsx` - Update query to include all musicdb fields  
3. `src/hooks/useFilterResults.ts` - Update interface type
4. `src/components/filters/FilterModal.tsx` - Update interface type
5. `src/components/filters/CreateFilterSheet.tsx` - Update interface type
6. `src/components/scores/FiltersSection.tsx` - Update interface type
