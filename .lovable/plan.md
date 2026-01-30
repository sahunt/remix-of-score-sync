
# Update musicdb with eamuse_id Mappings from ZIP

## Overview
Update the `musicdb` table by mapping `eamuse_id` values to rows based on `song_id` as the source of truth. The mappings are contained in 14 CSV files within the uploaded zip archive.

## Current State
- **Total unique songs in musicdb:** 1,395
- **Rows with eamuse_id set:** 0 (recently cleared)
- **Success criteria:** 1,376 rows updated

## Approach
Since the existing `update-eamuse-ids` edge function expects CSV content with `song_id` and `EncodedID` headers, we need to:

1. Extract the 14 CSV files from the zip archive
2. Process each CSV file sequentially through the edge function
3. Track cumulative results to ensure 1,376 total mappings

## Implementation Steps

### Step 1: Copy ZIP to Public Directory
Copy the uploaded zip file to the `public/` directory so it can be accessed:
```
lov-copy user-uploads://files.zip public/eamuse-mappings.zip
```

### Step 2: Create a Batch Processing Script
Create an admin page or script that:
1. Fetches and extracts the zip file
2. Reads each of the 14 CSV files (batch_01_of_14.csv through batch_14_of_14.csv)
3. Calls the `update-eamuse-ids` edge function for each batch
4. Accumulates and displays results

### Step 3: Update Edge Function (if needed)
The current edge function expects headers `song_id` and `EncodedID`. I need to verify the CSV format matches this expectation.

### Step 4: Execute Updates
Run the batch processor to update all 14 files sequentially, tracking:
- Songs updated per batch
- Songs not found
- Any duplicate eamuse_ids
- Total cumulative count

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `public/eamuse-mappings.zip` | Copy | Store the mapping data |
| `src/pages/AdminUpdateMappings.tsx` | Create | Admin page to trigger batch updates |
| `src/App.tsx` | Modify | Add route for admin page |

## Alternative Approach (Simpler)
If the CSV files follow the expected format, we can:
1. Manually extract the zip locally
2. Call the edge function 14 times via curl/API, passing each CSV's content
3. This avoids creating UI code

## Verification Query
After completion, run:
```sql
SELECT COUNT(DISTINCT song_id) as songs_with_mapping 
FROM musicdb 
WHERE eamuse_id IS NOT NULL;
```
Expected result: 1,376

## Technical Notes
- The edge function updates ALL chart rows for a given `song_id` (multiple difficulty levels)
- `song_id` is the primary key for matching, not `chart_id`
- The function already handles batch processing (50 at a time) and reports unmatched songs
