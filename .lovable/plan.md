

# Plan: Update eamuse_id Mappings from CSV

## Overview
Create an edge function to update the `eamuse_id` column in the `musicdb` table using the provided CSV file. The function will use `song_id` as the source of truth and update the corresponding `eamuse_id` values, then verify there are no duplicate eamuse_ids.

## Current State
- **musicdb table**: 1,395 unique songs, but only 1,301 unique eamuse_ids
- **Existing duplicates**: ~20+ eamuse_ids are currently mapped to multiple song_ids
- **CSV file**: Contains 1,323 song_id to eamuse_id mappings (header + 1,323 data rows)

## Implementation Steps

### Step 1: Create Update Edge Function
Create a new edge function `update-eamuse-ids` that:
1. Accepts CSV content (directly, via URL, or storage path)
2. Parses the CSV to extract song_id → eamuse_id mappings
3. Updates all charts in musicdb matching each song_id with the new eamuse_id
4. Returns a summary of updates made

### Step 2: Deploy and Execute
1. Add function configuration to `supabase/config.toml`
2. Deploy the edge function
3. Call the function with the CSV content to perform the update

### Step 3: Verify Data Integrity
After the update, run verification queries to:
1. Confirm all mappings were applied
2. Check for any remaining duplicate eamuse_ids
3. Report any song_ids not found in musicdb

---

## Technical Details

### New Edge Function: `supabase/functions/update-eamuse-ids/index.ts`

```typescript
// Key logic:
// 1. Parse CSV: song_id,EncodedID
// 2. For each row, update musicdb SET eamuse_id = EncodedID WHERE song_id = song_id
// 3. Batch updates (100 at a time) for efficiency
// 4. Return summary with success/failure counts
```

**Function capabilities:**
- Accept CSV via `content`, `url`, or `storage_path` parameter
- Parse CSV format (header: `song_id,EncodedID`)
- Batch UPDATE operations to musicdb table
- Include duplicate check logic after updates
- Return detailed summary including:
  - Songs updated
  - Songs not found
  - Duplicate eamuse_ids detected

### Config Update: `supabase/config.toml`
Add the new function entry:
```toml
[functions.update-eamuse-ids]
verify_jwt = false
```

### Post-Update Verification
The function will include a final check that queries:
```sql
SELECT eamuse_id, COUNT(DISTINCT song_id) as song_count
FROM musicdb 
WHERE eamuse_id IS NOT NULL
GROUP BY eamuse_id 
HAVING COUNT(DISTINCT song_id) > 1
```

If duplicates are found, they will be reported in the response.

---

## Expected Outcome
- All 1,323 song_ids from the CSV will have their eamuse_id updated in musicdb
- Each eamuse_id will be unique to a single song_id (no duplicates)
- The function will report any songs in the CSV that don't exist in musicdb
- Song jackets will correctly load using the updated eamuse_ids

