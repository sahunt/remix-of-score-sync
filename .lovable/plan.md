

# Support Aggregated PhaseII Export Format

## Summary
Add support for a second PhaseII JSON structure where songs are the top-level objects containing nested `charts` arrays with optional `record` objects for played charts. Also fix incorrect halo/rank numeric mappings to match the official PhaseII tables.

---

## Official Mapping Tables (from PhaseII)

### Chart Index Mapping (Confirmed Correct)
| Index | Playstyle + Difficulty |
|-------|------------------------|
| 0 | SP BEGINNER |
| 1 | SP BASIC |
| 2 | SP DIFFICULT |
| 3 | SP EXPERT |
| 4 | SP CHALLENGE |
| 5 | DP BEGINNER |
| 6 | DP BASIC |
| 7 | DP DIFFICULT |
| 8 | DP EXPERT |
| 9 | DP CHALLENGE |

### Halo Numeric Mapping (NEEDS FIXING)
| Code | Meaning | Normalized |
|------|---------|------------|
| 100 | (empty) | clear |
| 600 | (empty) | clear |
| 1000 | FAILED | fail |
| 2000 | CLEARED | clear |
| 4000 | LIFE4 CLEARED | life4 |
| 200 | FULL COMBO | fc |
| 300 | GREAT FULL COMBO | gfc |
| 400 | PERFECT FULL COMBO | pfc |
| 500 | MARVELOUS FULL COMBO | mfc |

Current parser has these wrong (e.g., 2000 mapped to FC instead of CLEARED).

### Rank Numeric Mapping (Mostly Correct, needs updates)
| Code | Rank |
|------|------|
| 100 | E |
| 200 | D |
| 233 | D+ |
| 266 | C- |
| 300 | C |
| 333 | C+ |
| 366 | B- |
| 400 | B |
| 433 | B+ |
| 466 | A- |
| 500 | A |
| 533 | A+ |
| 566 | AA- |
| 600 | AA |
| 650 | AA+ |
| 700 | AAA |

---

## Format Comparison

| Aspect | Existing Format | New Aggregated Format |
|--------|----------------|----------------------|
| Structure | `[{ song: {...}, points, data, ... }]` | `[{ id, name, charts: [{ chart, data, record? }] }]` |
| Song ID location | `song.id` | Top-level `id` (mcode) |
| Chart index | `song.chart` (string like "SP EXPERT - 14") | `chart` (numeric 0-9) |
| Difficulty level | Parsed from chart string | `data.difficulty` |
| Score | `points` (top-level) | `record.points` |
| Halo/Rank/Flare | `data.halo`, `rank`, `flare` | `record.data.halo`, `record.data.rank`, `record.data.flare` |
| Timestamp | ISO string | Unix timestamp (seconds) |

---

## Implementation Plan

### 1. Fix `phaseii_normalizeHalo()` (Lines 669-713)

Replace the incorrect numeric mapping with the official table:

```typescript
function phaseii_normalizeHalo(halo: string | null): string | null {
  if (!halo) return null;
  
  const numericValue = parseInt(halo);
  if (!isNaN(numericValue) && halo === String(numericValue)) {
    // Official PhaseII halo code mapping
    const numericMap: Record<number, string> = {
      100: 'clear',   // (empty)
      200: 'fc',      // FULL COMBO
      300: 'gfc',     // GREAT FULL COMBO
      400: 'pfc',     // PERFECT FULL COMBO
      500: 'mfc',     // MARVELOUS FULL COMBO
      600: 'clear',   // (empty)
      1000: 'fail',   // FAILED
      2000: 'clear',  // CLEARED
      4000: 'life4',  // LIFE4 CLEARED
    };
    
    if (numericMap[numericValue] !== undefined) {
      return numericMap[numericValue];
    }
    
    // Fallback for any unexpected codes
    return 'clear';
  }
  
  // String-based normalization (unchanged)
  // ...
}
```

### 2. Fix `phaseii_normalizeRank()` (Lines 719-758)

Update with the official +/- variants:

```typescript
const numericMap: Record<number, string> = {
  100: 'E',
  200: 'D',
  233: 'D+',
  266: 'C-',
  300: 'C',
  333: 'C+',
  366: 'B-',
  400: 'B',
  433: 'B+',
  466: 'A-',
  500: 'A',
  533: 'A+',
  566: 'AA-',
  600: 'AA',
  650: 'AA+',
  700: 'AAA',
};
```

### 3. Add Aggregated Format Detection in `phaseii_extractBlocks()`

After the existing format checks, add detection for the new aggregated format:

```typescript
// Check if this is aggregated song-catalog format
// Characteristics: array of objects with top-level "id" and "charts" array, no "song" object
if (sanitized.trim().startsWith('[')) {
  const objects = phaseii_extractObjectsFromArray(sanitized);
  
  if (objects.length > 0) {
    const firstObj = objects[0];
    // Detect aggregated format: has "charts" array and top-level numeric "id", no "song" object
    if (firstObj.includes('"charts"') && 
        firstObj.match(/"id"\s*:\s*\d+/) && 
        !firstObj.includes('"song"')) {
      console.log('PhaseII: Detected aggregated song-chart format');
      return phaseii_extractAggregatedBlocks(objects);
    }
  }
  // ... existing direct array processing
}
```

### 4. New Function: `phaseii_extractAggregatedBlocks()`

Converts song-level objects into synthetic score blocks the existing parser can handle:

```typescript
function phaseii_extractAggregatedBlocks(songObjects: string[]): string[] {
  const scoreBlocks: string[] = [];
  
  for (const songObj of songObjects) {
    // Extract song_id (mcode) from top level
    const songIdMatch = songObj.match(/"id"\s*:\s*(\d+)/);
    if (!songIdMatch) continue;
    const songId = songIdMatch[1];
    
    // Extract charts array
    const chartsArray = phaseii_extractArray(songObj, 'charts');
    if (!chartsArray) continue;
    
    const chartObjects = phaseii_extractObjectsFromArray(chartsArray);
    
    for (const chartObj of chartObjects) {
      // Only process charts with a record (played charts)
      if (!chartObj.includes('"record"')) continue;
      
      // Extract chart index (0-9)
      const chartMatch = chartObj.match(/"chart"\s*:\s*(\d+)/);
      if (!chartMatch) continue;
      const chartIndex = parseInt(chartMatch[1]);
      
      // Extract difficulty level from nested data object
      const dataContent = phaseii_extractNestedObject(chartObj, 'data');
      const diffMatch = dataContent?.match(/"difficulty"\s*:\s*(\d+)/);
      const diffLevel = diffMatch ? diffMatch[1] : '0';
      
      // Extract record object
      const recordContent = phaseii_extractNestedObject(chartObj, 'record');
      if (!recordContent) continue;
      
      // Build a synthetic block that phaseii_extractFields can parse
      const syntheticBlock = buildSyntheticBlock(songId, chartIndex, diffLevel, recordContent);
      scoreBlocks.push(syntheticBlock);
    }
  }
  
  console.log(`PhaseII: Extracted ${scoreBlocks.length} score blocks from aggregated format`);
  return scoreBlocks;
}
```

### 5. Helper: `buildSyntheticBlock()`

Converts an aggregated record into the format `phaseii_extractFields()` expects:

```typescript
function buildSyntheticBlock(
  songId: string, 
  chartIndex: number, 
  diffLevel: string, 
  recordContent: string
): string {
  const CHART_MAP: Record<number, { playstyle: string; difficulty: string }> = {
    0: { playstyle: 'SP', difficulty: 'BEGINNER' },
    1: { playstyle: 'SP', difficulty: 'BASIC' },
    2: { playstyle: 'SP', difficulty: 'DIFFICULT' },
    3: { playstyle: 'SP', difficulty: 'EXPERT' },
    4: { playstyle: 'SP', difficulty: 'CHALLENGE' },
    5: { playstyle: 'DP', difficulty: 'BEGINNER' },
    6: { playstyle: 'DP', difficulty: 'BASIC' },
    7: { playstyle: 'DP', difficulty: 'DIFFICULT' },
    8: { playstyle: 'DP', difficulty: 'EXPERT' },
    9: { playstyle: 'DP', difficulty: 'CHALLENGE' },
  };
  
  const chartInfo = CHART_MAP[chartIndex] || { playstyle: 'SP', difficulty: 'UNKNOWN' };
  const chartString = `${chartInfo.playstyle} ${chartInfo.difficulty} - ${diffLevel}`;
  
  // Extract fields from record content
  const pointsMatch = recordContent.match(/"points"\s*:\s*(\d+)/);
  const points = pointsMatch ? pointsMatch[1] : '0';
  
  // Convert Unix timestamp to ISO string
  const timestampMatch = recordContent.match(/"timestamp"\s*:\s*(\d+)/);
  const timestamp = timestampMatch 
    ? new Date(parseInt(timestampMatch[1]) * 1000).toISOString()
    : null;
  
  // Extract nested data from record.data
  const recordDataContent = phaseii_extractNestedObject(`{${recordContent}}`, 'data');
  const haloMatch = recordDataContent?.match(/"halo"\s*:\s*(\d+)/);
  const rankMatch = recordDataContent?.match(/"rank"\s*:\s*(\d+)/);
  const flareMatch = recordDataContent?.match(/"flare"\s*:\s*(\d+)/);
  
  // Build synthetic block in existing format
  return JSON.stringify({
    song: { id: parseInt(songId), chart: chartString },
    points: points,
    data: {
      halo: haloMatch ? haloMatch[1] : null,
      rank: rankMatch ? rankMatch[1] : null,
      flare: flareMatch ? parseInt(flareMatch[1]) : null
    },
    timestamp: timestamp
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/process-upload/index.ts` | Fix halo/rank mappings, add aggregated format detection and extraction |
| `supabase/functions/process-upload/index_test.ts` | Add tests for aggregated format and corrected mappings |

---

## No Breaking Changes Guarantee

This implementation:
- Fixes incorrect halo mappings (improves accuracy for ALL PhaseII uploads)
- Adds new detection path without modifying existing parsing logic flow
- Existing flat format continues to work unchanged
- Sanbai parser completely untouched
- All output goes through same `ScoreRecord` interface
- Database schema unchanged
- Source type remains 'phaseii' for both formats

---

## Testing Considerations

1. **Aggregated format detection**: Verify files with `charts` array and top-level `id` are detected
2. **Chart index mapping**: 0-9 correctly maps to SP/DP + difficulty names
3. **Unix timestamp conversion**: Converts to ISO string correctly
4. **Nested `record.data` extraction**: Halo/rank/flare extracted from correct location
5. **Charts without `record`**: Skipped (unplayed)
6. **Corrected halo codes**: 200=FC, 300=GFC, 400=PFC, 500=MFC, 2000=CLEARED
7. **Corrected rank codes**: Including +/- variants (233=D+, 266=C-, etc.)

