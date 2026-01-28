
# Phase 1: Populate Master MusicDB with Song Catalog

## Overview

This plan focuses on populating the `musicdb` table with the complete song and chart catalog from `musicdb.xml`. This is the critical first step before handling user score uploads.

## Current State

- **musicdb table**: 40 test records across 5 songs
- **XML file**: ~16,377 lines containing ~1,200+ songs with Japanese character support
- **Missing columns**: series, eventno, title_yomi, name_romanized, sanbai_song_id, basename

## What This Plan Does

1. Updates the database schema with new columns
2. Clears existing test data
3. Creates an edge function to parse and import the XML
4. Populates ~10,000+ chart records from the XML

---

## Implementation Steps

### Step 1: Database Migration

Add new columns to support the full XML data:

```sql
-- Add new columns
ALTER TABLE public.musicdb 
ADD COLUMN IF NOT EXISTS series smallint,
ADD COLUMN IF NOT EXISTS eventno smallint,
ADD COLUMN IF NOT EXISTS title_yomi text,
ADD COLUMN IF NOT EXISTS name_romanized text,
ADD COLUMN IF NOT EXISTS sanbai_song_id text,
ADD COLUMN IF NOT EXISTS basename text;

-- Create unique constraint for UPSERT
ALTER TABLE public.musicdb 
ADD CONSTRAINT musicdb_unique_chart 
UNIQUE (song_id, playstyle, difficulty_name);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_musicdb_sanbai_id 
ON public.musicdb(sanbai_song_id) WHERE sanbai_song_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_musicdb_name_match 
ON public.musicdb(name, playstyle, difficulty_name);
```

### Step 2: Clear Test Data

Remove existing test records:

```sql
DELETE FROM public.user_scores;
DELETE FROM public.uploads;  
DELETE FROM public.musicdb;
```

### Step 3: Create Import Edge Function

**File:** `supabase/functions/import-musicdb/index.ts`

The edge function will:

1. Accept XML content as POST body
2. Parse all `<music>` elements using Deno's DOMParser
3. For each song, expand into chart rows:
   - Positions 0-4: SP (BEGINNER, BASIC, DIFFICULT, EXPERT, CHALLENGE)
   - Positions 5-9: DP (BEGINNER, BASIC, DIFFICULT, EXPERT, CHALLENGE)
   - Skip if difficulty level = 0
4. Generate computed chart_id: `song_id * 100 + position_index`
5. Batch insert using service role key
6. Return summary of imported records

**Data Mapping:**

| XML Field | DB Column | Notes |
|-----------|-----------|-------|
| mcode | song_id | Primary song identifier |
| title | name | Full title (Japanese supported) |
| title_yomi | title_yomi | Romanized reading |
| artist | artist | Artist name (Japanese supported) |
| bpmmax | bpm_max | Maximum BPM |
| series | series | Game version number |
| eventno | eventno | Event unlock number (optional) |
| basename | basename | Internal identifier |

**Chart ID Formula:**

```text
chart_id = (song_id * 100) + position_index

Example for mcode=38062:
- SP BEGINNER (pos 0) -> chart_id = 3806200
- SP EXPERT (pos 3)   -> chart_id = 3806203
- DP DIFFICULT (pos 7) -> chart_id = 3806207
```

### Step 4: Update config.toml

Register the new edge function:

```toml
project_id = "cjosawtrjeyqavdsffuy"

[functions.import-musicdb]
verify_jwt = false
```

### Step 5: Store XML Reference

Copy the musicdb.xml file to `public/data/musicdb.xml` for future reference and diffs.

---

## Edge Function Details

### Endpoint
- **POST** `/import-musicdb`
- No authentication required (uses service role internally)
- Input: `{ "content": "<xml string>" }`

### Core Logic

```text
1. Parse XML using DOMParser
2. Query all <music> elements
3. For each music element:
   - Extract mcode, title, title_yomi, artist, bpmmax, series, eventno, basename
   - Parse diffLv array (10 space-separated values)
   - For each position 0-9:
     - If value > 0, create chart record
     - Set playstyle: positions 0-4 = "SP", 5-9 = "DP"
     - Set difficulty_name based on position index
     - Calculate chart_id = song_id * 100 + position
4. Batch insert all charts (500 at a time)
5. Return summary: { songs_processed, charts_inserted }
```

### Difficulty Position Mapping

| Position | Playstyle | Difficulty Name |
|----------|-----------|-----------------|
| 0 | SP | BEGINNER |
| 1 | SP | BASIC |
| 2 | SP | DIFFICULT |
| 3 | SP | EXPERT |
| 4 | SP | CHALLENGE |
| 5 | DP | BEGINNER |
| 6 | DP | BASIC |
| 7 | DP | DIFFICULT |
| 8 | DP | EXPERT |
| 9 | DP | CHALLENGE |

---

## Expected Results

After running the import:

- **~1,200 unique songs** in the database
- **~10,000+ chart records** (each song has 5-10 charts)
- **Full Japanese character support** in titles and artist names
- **title_yomi column** populated for romanized search
- **Computed chart_id** for each chart for precise matching

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | RUN | Add columns, constraint, indexes |
| `supabase/functions/import-musicdb/index.ts` | CREATE | XML parser and importer |
| `supabase/config.toml` | UPDATE | Register edge function |
| `public/data/musicdb.xml` | CREATE | Store XML for future reference |

---

## Japanese Character Support

The database already uses UTF-8 encoding, so Japanese characters will be stored correctly. Examples from the XML:

- `漆黒のスペシャルプリンセスサンデー` (title)
- `日向美ビタースイーツ♪` (artist)
- `シツコクノスヘシヤルフリンセスサンテエ` (title_yomi in katakana)

No additional encoding configuration is needed - PostgreSQL text columns handle this natively.

---

## After This Phase

Once the musicdb is populated, Phase 2 will update the `process-upload` edge function to:
- Detect PhaseII vs Sanbai file formats
- Parse each format correctly
- Map scores to the new musicdb records
- Store sanbai_song_id when discovered for future lookups
