

# Fix Home Search to Match Scores Page Logic

## Problem Identified

The Home page search is **NOT** using the exact same logic as the Scores page:

| Field | Scores Page | Home Page |
|-------|-------------|-----------|
| `name` | ✅ Searched | ✅ Searched |
| `artist` | ✅ Searched | ✅ Searched |
| `name_romanized` | ✅ Searched | ❌ **Missing** |

### Root Cause

The `useAllChartsCache` hook doesn't fetch `name_romanized` from the database, so it's not available for searching.

**Current select in `useAllChartsCache.ts`:**
```typescript
.select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle')
```

**Missing:** `name_romanized`

---

## Solution

### 1. Extend `useAllChartsCache` to fetch `name_romanized`

Add `name_romanized` to the select query and the `FullChartInfo` interface.

### 2. Update `useSongCatalogSearch` to search `name_romanized`

Add `name_romanized` to the search matching logic, exactly like the Scores page.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAllChartsCache.ts` | Add `name_romanized` to select and interface |
| `src/hooks/useSongCatalogSearch.ts` | Add `name_romanized` to search matching |

---

## Implementation Details

### useAllChartsCache.ts

```typescript
export interface FullChartInfo extends ChartInfo {
  id: number;
  song_id: number;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
  name_romanized: string | null;  // ADD THIS
}

// In the query:
.select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized')
```

### useSongCatalogSearch.ts

```typescript
// Match against name, artist, and name_romanized (same as Scores page)
const name = chart.name?.toLowerCase() ?? '';
const artist = chart.artist?.toLowerCase() ?? '';
const nameRomanized = chart.name_romanized?.toLowerCase() ?? '';

if (name.includes(trimmed) || artist.includes(trimmed) || nameRomanized.includes(trimmed)) {
  // ... add to results
}
```

---

## Testing

1. Search for a Japanese song using its romanized name (e.g., "butterfly" for "バタフライ")
2. Search by artist name (e.g., "smile dk")
3. Verify results match what appears on the Scores page search

