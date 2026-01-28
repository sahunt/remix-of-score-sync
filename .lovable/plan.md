# Robust PhaseII Upload: Field-Level Extraction

## Status: ✅ IMPLEMENTED

## Problem
`JSON.parse()` fails on control characters in fields we don't need (like `newRecord`), causing entire uploads to fail.

## Solution (Implemented)
Extract only required fields using targeted regex patterns. Skip corrupted entries instead of failing the whole upload.

## Fields Extracted

| Field Path | Regex Pattern | Purpose |
|------------|---------------|---------|
| `song.id` | `/"song"\s*:\s*\{[^}]*?"id"\s*:\s*(\d+)/` | Chart matching key |
| `song.chart` | `/"chart"\s*:\s*"([^"]+)"/` | Playstyle + difficulty + level |
| `points` | `/"points"\s*:\s*"?([^",}\s]+)"?/` | Score value |
| `data.halo` | `/"halo"\s*:\s*"([^"]+)"/` | Lamp/halo |
| `data.rank` | `/"rank"\s*:\s*"([^"]+)"/` | Grade |
| `data.flare` | `/"flare"\s*:\s*(\d+)/` | Flare level |
| `timestamp` | `/"timestamp"\s*:\s*"([^"]+)"/` | When played |

## Implementation Details

1. **Entry Block Splitting**: Parses the file character-by-character to find `{...}` blocks, tracking brace depth and string state
2. **Regex Field Extraction**: Each block is processed with individual regex patterns to extract only needed fields
3. **Error Handling**: Corrupted entries are skipped and counted; processing continues with remaining entries
4. **Batch Matching**: Uses existing optimized batch matching for song_id lookups

## Expected Behavior

| Scenario | Result |
|----------|--------|
| Clean entry | Extract fields, match to musicdb, insert score |
| Entry with corrupted `newRecord` | Extract clean fields, ignore newRecord, insert score |
| Entry with corrupted required field | Skip entry, log as "corrupt_entry", continue |
| File with 2% bad entries | 98% success, clear report of what was skipped |
