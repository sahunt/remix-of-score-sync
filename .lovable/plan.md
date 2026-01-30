
# Fix Songs Not Displaying on Scores Page

## Problem Summary
Stats show correct counts (e.g., 237 Level 14 songs) but the song list displays "No scores found" - data exists in the database but isn't rendering in the UI.

## Root Cause
**Inconsistent `musicdb` queries across the codebase**

Several files fetch incomplete `musicdb` data (only `name, artist`) while the display components expect the full shape including `eamuse_id` and `song_id`. This causes rendering logic to fail when trying to use missing fields.

## Files to Update

### 1. Home.tsx (Line 109)
**Current:**
```typescript
musicdb(name, artist)
```
**Change to:**
```typescript
musicdb(name, artist, eamuse_id, song_id)
```

### 2. CreateGoalSheet.tsx (Line 115)
**Current:**
```typescript
musicdb(name, artist)
```
**Change to:**
```typescript
musicdb(name, artist, eamuse_id, song_id)
```

### 3. useFilterResults.ts - Update Interface (Lines 4-12)
**Current:**
```typescript
interface ScoreData {
  ...
  musicdb: { name: string | null; artist: string | null } | null;
}
```
**Change to:**
```typescript
interface ScoreData {
  ...
  musicdb: { 
    name: string | null; 
    artist: string | null;
    eamuse_id: string | null;
    song_id: number | null;
  } | null;
}
```

## Implementation Steps

1. Update `src/pages/Home.tsx` - Add `eamuse_id, song_id` to musicdb query
2. Update `src/components/goals/CreateGoalSheet.tsx` - Add `eamuse_id, song_id` to musicdb query  
3. Update `src/hooks/useFilterResults.ts` - Expand `ScoreData` interface to include all musicdb fields

## Expected Outcome
After these changes, the song cards will render correctly because:
- All queries will return the complete `musicdb` object
- TypeScript interfaces will match the actual data shape
- Display components will have access to `song_id` for unique keys and `eamuse_id` for jacket art lookups

## Additional Note
The user should also perform a hard browser refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) after deployment to ensure the latest JavaScript is loaded.
