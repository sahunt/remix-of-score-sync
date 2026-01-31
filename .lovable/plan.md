

# Add Era Column to MusicDB

## Overview

Add an `era` column to the `musicdb` table and populate it using the uploaded CSV file containing 1,269 song-to-era mappings. The era values are small integers (0, 1, 2) that classify songs by game era.

---

## Data Analysis

**CSV Structure:**
- Header: `song_name,eamuse_id,era`
- 1,269 data rows
- Era values: 0, 1, or 2 (SMALLINT is appropriate)
- `eamuse_id` is the 32-character identifier used to match musicdb rows

**Database Impact:**
- Each `eamuse_id` in musicdb appears in multiple rows (one per difficulty chart)
- ~1,269 unique songs will update ~10,000+ rows total (same as romanized titles pattern)

---

## Implementation Strategy

Following the established **bulk update pattern** (used for romanized titles), we will:

1. **Add the column** via migration (nullable SMALLINT)
2. **Create an RPC function** that updates all rows atomically in a single transaction
3. **Create an edge function** that parses CSV and calls the RPC
4. **Create an admin UI page** to trigger the import

This approach avoids timeouts and rate-limiting by processing all updates in a single database transaction.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | CREATE | Add `era` column to musicdb |
| `supabase/migrations/...` | CREATE | Create `bulk_update_era` RPC function |
| `supabase/functions/import-era/index.ts` | CREATE | Edge function to parse CSV and call RPC |
| `supabase/config.toml` | MODIFY | Add `import-era` function config |
| `public/ddr_all_songs_era.csv` | COPY | Copy uploaded CSV to public folder |
| `src/pages/AdminImportEra.tsx` | CREATE | Admin UI page for triggering import |
| `src/App.tsx` | MODIFY | Add route for admin import era page |
| `src/integrations/supabase/types.ts` | AUTO-UPDATE | Types will auto-update after migration |

---

## Technical Details

### 1. Database Migration - Add Era Column

```sql
ALTER TABLE musicdb ADD COLUMN era SMALLINT;
```

### 2. Database Migration - Bulk Update RPC Function

```sql
CREATE OR REPLACE FUNCTION bulk_update_era(updates JSONB)
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE musicdb m
  SET era = (u->>'era')::SMALLINT
  FROM jsonb_array_elements(updates) AS u
  WHERE m.eamuse_id = (u->>'eamuse_id');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN QUERY SELECT updated_count;
END;
$$;
```

This function:
- Accepts a JSONB array of `{eamuse_id, era}` objects
- Updates ALL rows matching each eamuse_id in a single atomic transaction
- Returns the total count of rows updated (should be ~10,000+)

### 3. Edge Function - Parse CSV and Call RPC

The edge function will:
1. Receive CSV content from the client
2. Parse each line to extract `eamuse_id` and `era` (ignoring `song_name`)
3. Handle quoted fields in CSV
4. Call the `bulk_update_era` RPC with all mappings
5. Return the update count

Key CSV parsing logic:
- Skip header row
- Handle quoted song_name field (the first column has commas inside quotes)
- Extract the 32-character eamuse_id (second column)
- Parse era as integer (third column)

### 4. Admin UI Page

A simple page matching the existing admin import pattern:
- "Start Import" button
- Progress indicator during import
- Success/error display with row count

---

## Data Flow

```text
User clicks "Start Import" on /admin/import-era
        ↓
Frontend fetches /ddr_all_songs_era.csv from public folder
        ↓
Frontend sends CSV content to import-era edge function
        ↓
Edge function parses 1,269 rows → [{eamuse_id, era}, ...]
        ↓
Edge function calls bulk_update_era RPC with all mappings
        ↓
RPC updates all matching rows atomically (~10,000 rows)
        ↓
Returns updated_count to UI
```

---

## Why This Approach Avoids Errors

| Problem | Solution |
|---------|----------|
| Cloudflare/Supabase timeout (30-60s) | Single RPC call processes all updates in one transaction |
| Rate limiting (429 errors) | No batched HTTP requests - just one database call |
| Partial updates | Atomic transaction - all or nothing |
| URL length limits | RPC accepts JSONB body, not URL params |

---

## Expected Outcome

- `era` column added to musicdb table
- All ~10,000+ rows updated with era values (0, 1, or 2)
- Admin UI shows success with exact row count
- No timeout or rate limit errors

