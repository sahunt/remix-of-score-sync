

# Robust PhaseII Upload: Field-Level Extraction

## Problem
`JSON.parse()` fails on control characters in fields we don't need (like `newRecord`), causing entire uploads to fail.

## Solution
Extract only required fields using targeted regex patterns. Skip corrupted entries instead of failing the whole upload.

## Fields We Need (from your screenshot)

| Field Path | Example | Purpose |
|------------|---------|---------|
| `song.id` | 38371 | Chart matching key |
| `song.chart` | "SP EXPERT - 15" | Playstyle + difficulty + level |
| `points` | "999,880" | Score value |
| `data.halo` | "PERFECT FULL COMBO" | Lamp/halo |
| `data.rank` | "AAA" | Grade |
| `data.flare` | 10 | Flare level |
| `timestamp` | "2025-11-19 21:34:50" | When played |

## Implementation

### 1. Entry-Level Extraction
```text
Instead of: JSON.parse(entireFile)
Do: Split file into entry blocks, extract fields from each
```

### 2. Regex Field Extraction
For each entry block, extract fields individually:
```
"song":\s*\{[^}]*"id":\s*(\d+)
"chart":\s*"([^"]+)"
"points":\s*"([^"]+)"
"halo":\s*"([^"]+)"
"rank":\s*"([^"]+)"
"flare":\s*(\d+)
```

### 3. Error Handling Per Entry
- If field extraction fails for an entry → skip it, log reason
- Continue processing remaining entries
- Report: "Processed 450/452 scores (2 skipped due to corruption)"

## Changes Required

| File | Change |
|------|--------|
| `supabase/functions/process-upload/index.ts` | Replace JSON.parse with regex-based field extraction |

## Expected Behavior

| Scenario | Result |
|----------|--------|
| Clean entry | Extract fields, match to musicdb, insert score |
| Entry with corrupted `newRecord` | Extract clean fields, ignore newRecord, insert score |
| Entry with corrupted required field | Skip entry, log as "corrupt_entry", continue |
| File with 2% bad entries | 98% success, clear report of what was skipped |

## Benefits
- Never fails entire upload due to one bad entry
- Ignores fields we don't need (newRecord, ghost, medal, etc.)
- Clear reporting of what succeeded vs what was skipped
- Works regardless of what garbage characters appear in unused fields

