
# Fix Corrupted musicdb Rows

## Overview
Update 7 songs in the musicdb table to fix corrupted `eamuse_id` values. The XML metadata (name, artist, bpm, etc.) is already correct - only the `eamuse_id` field needs fixing.

## Songs to Fix

| song_id | Song Name | Corrupted eamuse_id | Correct eamuse_id |
|---------|-----------|---------------------|-------------------|
| 38433 | MOVE! (We Keep It Movin') | Artist fragment | `19old9dq1q9DilPQDol88d19dI96blb6` |
| 37278 | Every Day, Every Night(NM STYLE) | `3 4 6 9 0 0 4 7 10 0` | `61Q6Q8OOiiQIbIi0l6l10qQ0Ii8P0Qb6` |
| 38524 | DUAL STRIKER | diffLv array | `9b60DI1OQddDI6D9D1qPoDPODD19Db8d` |
| 38105 | Help me, ERINNNNNN!! | `4 5 9 12 0 0 6 9 12 0` | `9dDOQo8bQ6blDdd989l1QIO8liDq9O0q` |
| 38436 | スーパー戦湯ババンバーン | diffLv array | `boqo0IoO8DodOl99Q8P8qOi8PqDq11b1` |
| 38527 | 斑咲花 | `3 7 12 16 0 0 7 12 15 0` | `I86OI9lQ1qQ66dPDlddo8PoPo01PO66i` |
| 38439 | ユメブキ | Artist fragment | `IPid909iDid06d68IDo816OqbdQq8O0O` |

## Implementation

### Step 1: Create Edge Function for Batch Metadata Updates
Create a new edge function `fix-musicdb-rows` that accepts an array of song fixes:

```text
POST body: {
  "fixes": [
    {
      "song_id": 38433,
      "eamuse_id": "19old9dq1q9DilPQDol88d19dI96blb6"
    },
    ...
  ]
}
```

The function will:
1. Loop through each fix
2. Update ALL chart rows for that song_id (typically 7-10 rows per song)
3. Set the correct `eamuse_id` value
4. Return a summary of rows updated

### Step 2: Call the Edge Function
Invoke the function with the 7 song fixes to update all ~50 affected chart rows.

## Affected Chart Rows
Each song has 7-10 chart entries (SP + DP difficulties). The update will fix approximately 50-60 rows total across the 7 songs.

## Technical Details

**Why edge function instead of direct SQL?**
- Edge functions use the service role key for admin access
- Consistent with existing patterns (update-eamuse-ids, import-musicdb)
- Better logging and error handling
- Can be reused for future fixes

**Database constraint:**
- Uses `song_id` as the lookup key (source of truth per memory)
- Updates `eamuse_id` column only - metadata is already correct
- All chart rows for a song share the same eamuse_id

## Expected Outcome
After running this fix:
- 7 songs will have correct 32-character eamuse_id values
- Your next Sanbai upload should match these songs successfully
- Approximately 50+ score entries from the skipped 101 should now match
