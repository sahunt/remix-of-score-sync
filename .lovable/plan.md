

# Add name_romanized and artist to Song Search

## Overview

Extend the search functionality on the Scores page to also match against `name_romanized` from musicdb, in addition to the existing `name` and `artist` fields. This allows users to find songs by typing romanized versions of Japanese titles (e.g., typing "identity" to find a song where only the romanized title contains that text).

## Current Behavior

The search filter at lines 429-435 in `Scores.tsx` currently matches:
- `name` - the primary song title
- `artist` - the song artist

## Changes Required

### 1. Update Database Queries to Include name_romanized

**User Scores Query (lines 252-257)**
Add `name_romanized` to the musicdb join:
```
musicdb (
  name,
  artist,
  eamuse_id,
  song_id,
  name_romanized  <-- ADD
)
```

**MusicDb Charts Query (line 325)**
Add `name_romanized` to the select:
```
'id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized'
```

### 2. Update Type Interfaces

| Interface | File | Change |
|-----------|------|--------|
| `ScoreWithSong` (local) | Scores.tsx:18-34 | Add `name_romanized: string \| null` to musicdb object |
| `MusicDbChart` | Scores.tsx:36-45 | Add `name_romanized: string \| null` |
| `DisplaySong` | Scores.tsx:47-60 | Add `name_romanized: string \| null` |

### 3. Update Mapping Logic

**Played songs mapping (lines 346-359)**
Add: `name_romanized: s.musicdb?.name_romanized ?? null`

**No-play songs mapping (lines 407-422)**
Add: `name_romanized: chart.name_romanized`

### 4. Update Search Filter (lines 429-435)

Current:
```typescript
result = result.filter(s => {
  const name = s.name?.toLowerCase() ?? '';
  const artist = s.artist?.toLowerCase() ?? '';
  return name.includes(query) || artist.includes(query);
});
```

Updated:
```typescript
result = result.filter(s => {
  const name = s.name?.toLowerCase() ?? '';
  const artist = s.artist?.toLowerCase() ?? '';
  const nameRomanized = s.name_romanized?.toLowerCase() ?? '';
  return name.includes(query) || artist.includes(query) || nameRomanized.includes(query);
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Scores.tsx` | Update interfaces, queries, mappings, and search filter |

## What Stays the Same

- UI components (no visual changes)
- Filter chips and saved filters behavior
- Typeahead/live filtering behavior
- Sort options and direction
- Card rendering and display

## Example Use Case

A song with:
- `name`: "アイデンティティ"
- `name_romanized`: "Identity"

User types "identity" and the song now appears in results.

