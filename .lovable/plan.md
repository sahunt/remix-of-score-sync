
# Phase 2: Multi-Source Score Upload Processing (Updated)

## Overview

This plan updates the `process-upload` edge function to parse and map scores from PhaseII JSON and Sanbai CSV/TSV to the master `musicdb` catalog. It enforces **chart-level matching** (not just song-level) and adds source tracking for future UI display.

## Critical Constraint

**We can NEVER create new musicdb entries.** All scores must match an existing chart record or be skipped.

## File Format Analysis

### PhaseII JSON Structure

```json
{
  "data": [
    {
      "song": {
        "db_id": 263561,
        "id": 36935,
        "chart": "SP CHALLENGE - 14",
        "name": "華爛漫 -Flowers-",
        "data": { "difficulty": 14 }
      },
      "timestamp": "2026-01-20 08:47:39",
      "username": "LUMEN",
      "points": "999,910",
      "data": {
        "rank": "AAA",
        "halo": "PERFECT FULL COMBO",
        "flare": 10
      }
    }
  ]
}
```

### Sanbai TSV Structure

```text
Song ID	Song Name	Difficulty	Rating	Score	Grade	Lamp	Flare
00obPO6oPIPOoD9qb0dIl6q6D8P6o9bI	IX	DSP	14	999670	AAA	PFC	X
00obPO6oPIPOoD9qb0dIl6q6D8P6o9bI	IX	ESP	16	998450	AAA	GFC	IX
00obPO6oPIPOoD9qb0dIl6q6D8P6o9bI	IX	CSP	18	985230	AA+	Clear	VII
```

Note: Same `Song ID` appears multiple times for different charts of the same song.

## Chart-Level Matching Strategy

### Key Clarification: sanbai_song_id is Song-Level Only

The `sanbai_song_id` column in `musicdb` identifies the **song**, not the chart. Multiple `musicdb` rows share the same `sanbai_song_id` (one per difficulty/playstyle combination).

**Therefore, matching MUST always include playstyle + difficulty_name in addition to any song identifier.**

### Difficulty Code Parsing

Sanbai difficulty codes encode both playstyle AND difficulty name:

| Code | Playstyle | Difficulty Name |
|------|-----------|-----------------|
| bSP  | SP        | BEGINNER        |
| BSP  | SP        | BASIC           |
| DSP  | SP        | DIFFICULT       |
| ESP  | SP        | EXPERT          |
| CSP  | SP        | CHALLENGE       |
| BDP  | DP        | BASIC           |
| DDP  | DP        | DIFFICULT       |
| EDP  | DP        | EXPERT          |
| CDP  | DP        | CHALLENGE       |

### Matching Priority (Sanbai)

```text
For each Sanbai row:
  1. Parse difficulty code -> playstyle + difficulty_name
  2. Query musicdb WHERE:
     - sanbai_song_id = row.Song_ID
     - AND playstyle = parsed_playstyle
     - AND difficulty_name = parsed_difficulty_name
  3. If no match AND sanbai_song_id not in musicdb:
     - Fallback: Match by song name + playstyle + difficulty_name + difficulty_level
     - If match found: UPDATE musicdb.sanbai_song_id for all charts of that song
  4. If still no match: SKIP row (log as unmatched)
```

### Matching Priority (PhaseII)

```text
For each PhaseII item:
  1. Parse chart string "SP CHALLENGE - 14" -> playstyle + difficulty_name + level
  2. Query musicdb WHERE:
     - name ILIKE song.name (fuzzy match)
     - AND playstyle = parsed_playstyle
     - AND difficulty_name = parsed_difficulty_name
     - AND difficulty_level = parsed_level
  3. If no match: SKIP row (log as unmatched)
```

### Halo/Lamp Translation

| PhaseII Halo              | Sanbai Lamp | Stored Value |
|---------------------------|-------------|--------------|
| MARVELOUS FULL COMBO      | MFC         | mfc          |
| PERFECT FULL COMBO        | PFC         | pfc          |
| GREAT FULL COMBO          | GFC         | gfc          |
| GOOD FULL COMBO           | FC          | fc           |
| (clear)                   | Clear       | clear        |
| (fail)                    | Fail        | fail         |

## Database Changes

### Add source_type to user_scores

```sql
ALTER TABLE public.user_scores
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'unknown';
```

Values: `phaseii`, `sanbai`, `manual`, `unknown`

## Edge Function Implementation

### File: supabase/functions/process-upload/index.ts

#### 1. Source Detection

```typescript
function detectSourceType(content: string): 'phaseii' | 'sanbai' | 'unknown' {
  const trimmed = content.trim();
  
  // PhaseII: JSON with headers/data structure
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.headers && parsed.data) return 'phaseii';
    } catch {}
  }
  
  // Sanbai: TSV with "Song ID" header
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('Song ID') && firstLine.includes('\t')) {
    return 'sanbai';
  }
  
  return 'unknown';
}
```

#### 2. PhaseII Parser

```typescript
function parsePhaseIIChart(chart: string) {
  // "SP CHALLENGE - 14" -> { playstyle: 'SP', difficulty_name: 'CHALLENGE', level: 14 }
  const match = chart.match(/^(SP|DP)\s+(\w+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return {
    playstyle: match[1],
    difficulty_name: match[2].toUpperCase(),
    difficulty_level: parseInt(match[3])
  };
}

function normalizePhaseIIHalo(halo: string | null): string | null {
  if (!halo) return null;
  const map: Record<string, string> = {
    'MARVELOUS FULL COMBO': 'mfc',
    'PERFECT FULL COMBO': 'pfc',
    'GREAT FULL COMBO': 'gfc',
    'GOOD FULL COMBO': 'fc',
  };
  return map[halo.toUpperCase()] || 'clear';
}
```

#### 3. Sanbai Parser

```typescript
function parseSanbaiDifficulty(code: string) {
  // "ESP" -> { playstyle: 'SP', difficulty_name: 'EXPERT' }
  // "CDP" -> { playstyle: 'DP', difficulty_name: 'CHALLENGE' }
  const playstyle = code.endsWith('DP') ? 'DP' : 'SP';
  const diffChar = code[0];
  const diffMap: Record<string, string> = {
    'b': 'BEGINNER',
    'B': 'BASIC',
    'D': 'DIFFICULT',
    'E': 'EXPERT',
    'C': 'CHALLENGE'
  };
  return {
    playstyle,
    difficulty_name: diffMap[diffChar] || null
  };
}

function normalizeSanbaiLamp(lamp: string | null): string | null {
  if (!lamp) return null;
  const normalized = lamp.toLowerCase().trim();
  if (['mfc', 'pfc', 'gfc', 'fc', 'clear', 'fail'].includes(normalized)) {
    return normalized;
  }
  return 'clear';
}
```

#### 4. Chart-Level Matching Functions

```typescript
// Sanbai: Match by sanbai_song_id + playstyle + difficulty_name
async function matchSanbaiChart(
  supabase: any,
  sanbaiSongId: string,
  playstyle: string,
  difficultyName: string
): Promise<number | null> {
  const { data } = await supabase
    .from('musicdb')
    .select('id, song_id, chart_id')
    .eq('sanbai_song_id', sanbaiSongId)
    .eq('playstyle', playstyle)
    .eq('difficulty_name', difficultyName)
    .limit(1)
    .maybeSingle();
  
  return data?.id ?? null;
}

// Fallback: Match by name + playstyle + difficulty_name + level
async function matchByNameAndChart(
  supabase: any,
  songName: string,
  playstyle: string,
  difficultyName: string,
  difficultyLevel: number
): Promise<{ id: number; song_id: number } | null> {
  const { data } = await supabase
    .from('musicdb')
    .select('id, song_id')
    .ilike('name', songName)
    .eq('playstyle', playstyle)
    .eq('difficulty_name', difficultyName)
    .eq('difficulty_level', difficultyLevel)
    .limit(1)
    .maybeSingle();
  
  return data;
}
```

#### 5. Sanbai ID Discovery

When a Sanbai song matches by name but doesn't have `sanbai_song_id` set:

```typescript
// Update ALL charts for this song with the sanbai_song_id
async function discoverSanbaiSongId(
  supabase: any,
  songId: number,
  sanbaiSongId: string
) {
  await supabase
    .from('musicdb')
    .update({ sanbai_song_id: sanbaiSongId })
    .eq('song_id', songId);
}
```

## Parse Summary Output

```typescript
{
  total_rows: 150,
  mapped_rows: 142,
  skipped_rows: 8,
  source_type: 'sanbai',
  unmatched_songs: [
    { name: 'Some Removed Song', difficulty: 'ESP', reason: 'no_match' },
    // ...
  ]
}
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | CREATE | Add `source_type` column to `user_scores` |
| `supabase/functions/process-upload/index.ts` | REWRITE | Dual-format parsing with chart-level matching |

## Implementation Steps

1. **Database Migration**: Add `source_type` column to `user_scores`
2. **Rewrite process-upload**: 
   - Detect source format (PhaseII JSON vs Sanbai TSV)
   - Parse format-specific fields
   - Match at chart level (song identifier + playstyle + difficulty_name)
   - Store source_type per score
   - Log unmatched songs in parse_summary
3. **Test with sample files**: Verify both formats parse and match correctly

## Expected Behavior

| Scenario | Result |
|----------|--------|
| Sanbai row with known sanbai_song_id + valid chart | Score inserted with musicdb_id |
| Sanbai row with unknown sanbai_song_id, name matches | Score inserted + sanbai_song_id discovered |
| Sanbai row with no match | Skipped, logged in unmatched_songs |
| PhaseII row matching by name + chart | Score inserted with musicdb_id |
| PhaseII row with no match | Skipped, logged in unmatched_songs |
