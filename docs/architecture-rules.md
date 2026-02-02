# Architecture Rules

These rules prevent code duplication and ensure consistency across the codebase.

---

## 1. Types: Single Source of Truth

**Location:** `src/types/scores.ts`

| Interface | Purpose |
|-----------|---------|
| `ScoreWithSong` | Full score with musicdb relation |
| `ScoreForFiltering` | Minimal fields for filter matching |
| `DisplaySong` | Flattened for rendering in lists |
| `ChartInfo` | Chart metadata without user scores |
| `MusicDbChart` | Raw musicdb row structure |

**Rule:** Never define score interfaces locally in components. Always import from `src/types/scores.ts`.

---

## 2. Filter Logic: Centralized

**Location:** `src/lib/filterMatcher.ts`

```typescript
import { matchesFilterRule, filterScoresByRules } from '@/lib/filterMatcher';
```

**Rule:** All filter/rule matching must use this module. Never write `switch(rule.type)` logic elsewhere.

---

## 3. Data Fetching: Three Core Caches Only

The app uses exactly **3 React Query caches** to ensure consistent data:

### User Scores
- **Hook:** `useScores()` from `src/contexts/ScoresContext.tsx`
- **Query Key:** `['user-scores']`
- **Rule:** Single source for all user achievement data

### Goals
- **Hook:** `useGoals()` from `src/hooks/useGoals.ts`
- **Query Key:** `['goals']`
- **Rule:** Single source for goal definitions

### MusicDB (Chart Catalog)
- **Hook:** `useMusicDb()` from `src/hooks/useMusicDb.ts`
- **Query Key:** `['musicdb']`
- **Returns:**
  - `charts`: Flat array for filtering and goal calculations
  - `bySongId`: Map for instant modal population
- **Rule:** `staleTime: Infinity` - catalog only changes on admin import

### What NOT to Create
- ❌ `useUserStats` - Calculate from scores array
- ❌ `useServerGoalProgress` - Calculate from scores + musicdb
- ❌ `useMusicDbCount` - Use `musicdb.charts.length`
- ❌ Separate chart caches - Use unified `useMusicDb()`

---

## 4. Stats & Counts: Derive Client-Side

All statistics and counts must be calculated from the three core caches:

```typescript
// Example: Calculate stats from scores
const stats = useMemo(() => {
  const levelScores = scores.filter(s => s.difficulty_level === selectedLevel);
  const catalogCount = musicDb.charts.filter(c => c.difficulty_level === selectedLevel).length;
  
  return {
    total: levelScores.length,
    noPlay: catalogCount - levelScores.length,
    mfc: levelScores.filter(s => s.halo === 'MFC').length,
  };
}, [scores, musicDb, selectedLevel]);
```

**Rule:** Never create server-side RPCs for counts that can be derived from cached data.

---

## 5. Cache Invalidation: Simplified

**Location:** `src/hooks/useUploadInvalidation.ts`

```typescript
const { invalidateAfterUpload } = useUploadInvalidation();
```

After uploads, only 2 caches need invalidation:
- `['user-scores']` - User's played scores
- `['goals']` - Goal definitions

Everything else (stats, progress, counts) is derived and updates automatically.

**Rule:** Never manually invalidate caches elsewhere. Only call `invalidateAfterUpload()` after successful uploads.

---

## 6. Pagination: Required for Scores

Supabase limits responses to 1000 rows. All score fetches must paginate:

```typescript
const PAGE_SIZE = 1000;
let from = 0;
while (hasMore) {
  const { data } = await query.range(from, from + PAGE_SIZE - 1);
  from += PAGE_SIZE;
  hasMore = data?.length === PAGE_SIZE;
}
```

**Rule:** `useUserScores()` handles this automatically. Don't bypass it with direct queries.

---

## 7. Playstyle: SP Only

**Rule:** All queries must filter by `playstyle = 'SP'`. DP charts exist but are excluded from UI.

---

## 8. Chart Metadata: musicdb is Source of Truth

**Location:** `musicdb` table, accessed via `musicdb_id` foreign key

| Field | Source of Truth | Notes |
|-------|-----------------|-------|
| `difficulty_level` | `musicdb` | Never use user_scores.difficulty_level |
| `difficulty_name` | `musicdb` | Never use user_scores.difficulty_name |
| `playstyle` | `musicdb` | Never use user_scores.playstyle |
| `song_id` | `musicdb` | Never use user_scores.song_id |
| `score`, `rank`, `flare`, `halo` | `user_scores` | User achievements |

**Rule:** All queries must pull chart metadata from the `musicdb` relation, not from redundant columns in `user_scores`.

---

## 9. Before Creating New Code

| If you need... | Check first... |
|----------------|----------------|
| Filter/matching logic | `src/lib/filterMatcher.ts` |
| User scores | `useScores()` from context |
| Chart catalog | `useMusicDb()` |
| Goal definitions | `useGoals()` |
| Type definitions | `src/types/scores.ts` |
| Stats/counts | Derive from scores + musicdb |

---

## 10. File Organization

| Category | Location |
|----------|----------|
| Shared types | `src/types/*.ts` |
| Shared utilities | `src/lib/*.ts` |
| Data fetching hooks | `src/hooks/use*.ts` |
| React contexts | `src/contexts/*.tsx` |
| UI components | `src/components/**/*.tsx` |
| Page components | `src/pages/*.tsx` |

**Rule:** Keep files focused. Extract when a component exceeds ~300 lines or a hook handles multiple concerns.

---

## 11. Cache Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    React Query Caches                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   user-scores   │     goals       │       musicdb           │
│   (dynamic)     │   (dynamic)     │    (static/Infinity)    │
├─────────────────┴─────────────────┴─────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Client-Side Derived Data                  │   │
│  │  - Stats (MFC/PFC/AAA counts)                       │   │
│  │  - Goal progress (completed/total)                   │   │
│  │  - "No Play" counts                                  │   │
│  │  - Average scores                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
1. Single source of truth - no cache conflicts
2. Consistent counts across all pages
3. Only 2 invalidations after upload
4. Simpler debugging - check one array
