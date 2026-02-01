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

## 3. Data Fetching: Use Global Caches

### Scores
- **Context:** `useScores()` from `src/contexts/ScoresContext.tsx`
- **Hook:** `useUserScores()` from `src/hooks/useUserScores.ts`
- **Rule:** Consume from context/hook. No direct Supabase queries for user scores.

### Charts (MusicDB)
- **All charts:** `useAllChartsCache()` - flat array for filtering
- **By song:** `useSongChartsCache()` - grouped by song_id for modals
- **Rule:** Never query musicdb directly for chart lookups.

### Stats
- **Rule:** Derive from `displayedScores` (already filtered). Never re-filter raw data for stats.

---

## 4. Goal Progress: Server-Side First

**RPC:** `calculate_goal_progress` in PostgreSQL

**Hook:** `useServerGoalProgress()` from `src/hooks/useServerGoalProgress.ts`

**Rule:** Use RPC for completed/total counts. Client-side filtering only for display lists (Remaining, Completed tabs).

---

## 5. Cache Invalidation: Centralized

**Location:** `src/hooks/useUploadInvalidation.ts`

```typescript
const { invalidateAfterUpload } = useUploadInvalidation();
```

**Rule:** Only call `invalidateAfterUpload()` after successful uploads. Never manually invalidate score caches elsewhere.

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

## 8. Before Creating New Code

| If you need... | Check first... |
|----------------|----------------|
| Filter/matching logic | `src/lib/filterMatcher.ts` |
| Score data | `useScores()` or `useUserScores()` |
| Chart lookups | `useAllChartsCache()` or `useSongChartsCache()` |
| Goal counts | `useServerGoalProgress()` |
| Type definitions | `src/types/scores.ts` |

---

## 9. File Organization

| Category | Location |
|----------|----------|
| Shared types | `src/types/*.ts` |
| Shared utilities | `src/lib/*.ts` |
| Data fetching hooks | `src/hooks/use*.ts` |
| React contexts | `src/contexts/*.tsx` |
| UI components | `src/components/**/*.tsx` |
| Page components | `src/pages/*.tsx` |

**Rule:** Keep files focused. Extract when a component exceeds ~300 lines or a hook handles multiple concerns.
