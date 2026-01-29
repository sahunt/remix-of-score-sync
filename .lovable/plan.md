

# Populate musicdb with eamuse_id Mappings

## Overview
Use the existing `update-eamuse-ids` edge function to populate the cleared `eamuse_id` column with the 1,395 mappings from your CSV file.

## What Will Happen
1. Copy the CSV file to the project
2. Call the edge function with the CSV content
3. The function updates all matching `song_id` records with the corresponding `EncodedID` value
4. Returns a detailed report showing:
   - How many songs were updated
   - Which song_ids weren't found in musicdb (if any)
   - Any duplicate eamuse_ids detected

## Steps

### Step 1: Copy CSV to Project
Copy the uploaded file to the project so it can be used by the edge function.

### Step 2: Execute the Update
Call the `update-eamuse-ids` edge function with the CSV content. The function processes in batches of 50 songs to handle the 1,395 rows efficiently.

### Step 3: Verify Results
Review the response to confirm:
- All expected songs were updated
- No duplicate eamuse_ids exist
- Any missing song_ids are expected (songs in CSV but not in your musicdb)

---

## Technical Details

**Edge Function**: `supabase/functions/update-eamuse-ids/index.ts` (already exists)

**CSV Format Validation**:
- Header: `song_id,EncodedID` - matches expected format
- 1,395 data rows to process
- song_id is treated as source of truth for matching

**Database Operation**:
```sql
UPDATE musicdb SET eamuse_id = [EncodedID] WHERE song_id = [song_id]
```

**Safety Features**:
- Batched processing (50 at a time)
- Detailed logging of each batch
- Post-update duplicate detection
- Complete audit trail in response

