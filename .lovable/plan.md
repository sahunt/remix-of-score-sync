
# Add Sanbai Rating Column to MusicDB

## Summary
Add a new `sanbai_rating` column to the `musicdb` table and create an edge function to import difficulty ratings from a CSV file containing 5,671 chart ratings. Ratings are mapped using `eamuse_id` + `difficulty_name` for SP charts only.

---

## Data Analysis

| Item | Value |
|------|-------|
| CSV rows | 5,671 data rows |
| SP charts in musicdb | 5,834 total |
| SP charts with eamuse_id | 5,812 |
| Expected match rate | ~97% |

### CSV Format
```
eamuse_id,difficulty,rating
Q8bIDb60oPo890oi0l0O9PQd9lOb8o1Q.jpg,Difficult,14.40
```

### Mapping Logic
- Strip `.jpg` from eamuse_id
- Convert difficulty to UPPERCASE (Difficult → DIFFICULT)
- Match: `eamuse_id` + `difficulty_name` + `playstyle = 'SP'`
- Update `sanbai_rating` on matched row

---

## Phase 1: Database Migration

### Add Column
```sql
ALTER TABLE public.musicdb 
ADD COLUMN sanbai_rating DECIMAL(5,2);

COMMENT ON COLUMN public.musicdb.sanbai_rating IS 
  'Difficulty rating from Sanbai website, ranges from 1.00 to 19.70';
```

---

## Phase 2: Edge Function

### Create `import-sanbai-ratings` Function

Process ALL 5,671 rows with batch updates to ensure no skipping:

```text
┌──────────────────────────────────────────────────┐
│           import-sanbai-ratings                   │
├──────────────────────────────────────────────────┤
│  1. Parse CSV (all 5671 lines)                   │
│  2. Strip .jpg from eamuse_id                    │
│  3. Normalize difficulty → UPPERCASE              │
│  4. Batch lookup existing charts (SP only)       │
│  5. Update sanbai_rating for matched rows        │
│  6. Report matched/unmatched counts              │
└──────────────────────────────────────────────────┘
```

### Key Implementation Details

1. **No Skipping**: Process every line, report unmatched
2. **Batch Processing**: 100 rows per batch to stay within limits
3. **Accurate Matching**: Use composite key (eamuse_id, difficulty_name, playstyle)
4. **Detailed Reporting**: Track updated, not found, and errors

### Edge Function Structure
```typescript
// Parse all CSV lines
const ratings = parseCSV(content);
console.log(`Parsed ${ratings.length} ratings from CSV`);

// Process in batches of 100
for (const batch of batches) {
  // For each rating in batch:
  // - Strip .jpg from eamuse_id
  // - Convert difficulty to uppercase
  // - Update musicdb WHERE eamuse_id AND difficulty_name AND playstyle = 'SP'
  
  // Track: updated, not_found, errors
}

return {
  total_in_csv: ratings.length,
  charts_updated: count,
  not_found: [...],
  errors: [...]
};
```

---

## Phase 3: Admin Page

### Create Import Page at `/admin/import-ratings`

Simple interface to:
1. Copy CSV to public folder
2. Trigger edge function
3. Display results (updated count, unmatched list)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database | Add `sanbai_rating` column |
| `supabase/functions/import-sanbai-ratings/index.ts` | New edge function |
| `supabase/config.toml` | Add function config |
| `src/pages/AdminImportRatings.tsx` | New admin page |
| `src/App.tsx` | Add route |
| `public/sanbai_difficulty_ratings.csv` | Copy CSV file |

---

## Validation

After import, verify:
```sql
-- Should show ~5,600+ rows with ratings
SELECT COUNT(*) FROM musicdb 
WHERE sanbai_rating IS NOT NULL AND playstyle = 'SP';

-- Check distribution
SELECT difficulty_name, COUNT(*), AVG(sanbai_rating) 
FROM musicdb 
WHERE sanbai_rating IS NOT NULL AND playstyle = 'SP'
GROUP BY difficulty_name;
```

---

## Technical Notes

1. **Column Type**: `DECIMAL(5,2)` supports values from 0.00 to 999.99 (ratings are 1.00-19.70)
2. **No New Rows**: Only UPDATE existing charts, never INSERT
3. **SP Only**: Explicitly filter `playstyle = 'SP'` in all updates
4. **Complete Processing**: All 5,671 CSV rows processed and reported
