
# Import Romanized Titles to musicdb

## Overview

Populate the `name_romanized` field in musicdb using the CSV that maps `eamuse_id` to `romanized_title`. The CSV contains ~1,390 entries, each updating ALL chart rows in musicdb that share the same `eamuse_id` (multiple difficulties per song = ~7-8 rows per song on average).

## Key Insight

Unlike chart-level updates, this is a **song-level field** - one `eamuse_id` in the CSV should update ALL musicdb rows with that `eamuse_id`. This means ~1,390 CSV rows will update ~10,600+ database rows.

## Strategy: Database RPC Function

Individual UPDATE calls would hit rate limits and timeout. Instead, create a PostgreSQL function that processes the entire update in a **single transaction**:

```text
CSV (1,390 rows)
    ↓
Edge Function (parses CSV, sends JSONB array)
    ↓
RPC Function (bulk_update_romanized_titles)
    ↓
Single UPDATE statement with FROM clause
    ↓
All ~10,600 rows updated in one go
```

---

## Database Changes

### New RPC Function: `bulk_update_romanized_titles`

```sql
CREATE OR REPLACE FUNCTION bulk_update_romanized_titles(
  updates JSONB
)
RETURNS TABLE(updated_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE musicdb m
  SET name_romanized = (u->>'romanized_title')
  FROM jsonb_array_elements(updates) AS u
  WHERE m.eamuse_id = (u->>'eamuse_id');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN QUERY SELECT updated_count;
END;
$$;
```

**Why this works:**
- Processes all updates in a single transaction
- No rate limit issues (one database call)
- No timeout issues (PostgreSQL handles the batch efficiently)
- Matches the proven pattern from the Sanbai ratings bulk import

---

## Implementation Components

### 1. Edge Function: `import-romanized-titles`

Receives CSV content, parses it, and calls the RPC function:

| Step | Action |
|------|--------|
| 1 | Parse CSV into array of `{eamuse_id, romanized_title}` |
| 2 | Validate 32-character eamuse_ids |
| 3 | Convert to JSONB array |
| 4 | Call `bulk_update_romanized_titles` RPC |
| 5 | Return count of updated rows |

### 2. Admin Page: `/admin/import-romanized`

Simple UI matching the existing import pages:
- Fetches CSV from public folder
- Sends to edge function
- Displays results (total in CSV, rows updated)

### 3. Data File

Copy CSV to `public/romanized_titles.csv` for access by admin tool.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `public/romanized_titles.csv` | Copy uploaded CSV |
| Migration SQL | Create `bulk_update_romanized_titles` RPC function |
| `supabase/functions/import-romanized-titles/index.ts` | New edge function |
| `src/pages/AdminImportRomanized.tsx` | New admin page |
| `src/App.tsx` | Add route for admin page |

---

## Expected Results

| Metric | Expected Value |
|--------|----------------|
| CSV Rows | ~1,390 |
| DB Rows Updated | ~10,600+ |
| Match Rate | ~100% (all eamuse_ids should exist in musicdb) |

## Success Criteria

The import MUST complete in a single run without timeouts or partial updates, as the RPC function processes everything in one atomic transaction.
