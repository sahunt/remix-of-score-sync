# Data Integrity Checklist

Rules to prevent data consistency bugs. Review before any data-related changes.

---

## Golden Rules

### 1. ID-Based Matching Only
❌ NEVER: `${song_id}|${difficulty_name}` (composite string keys)
✅ ALWAYS: `musicdb_id` ↔ `chart.id` (database foreign keys)

### 2. Deterministic Pagination
All paginated queries MUST have stable ordering:
```typescript
.order('timestamp', { ascending: false, nullsFirst: false })
.order('id', { ascending: true })  // REQUIRED secondary sort
```

### 3. Single Source of Truth
| Data | Source | Never Use |
|------|--------|-----------|
| Chart metadata | `musicdb` table | `user_scores` columns |
| User achievements | `user_scores` | Derived/cached values |
| Catalog counts | `musicdb` query | Hardcoded numbers |

### 4. Math Must Always Balance
```
catalog_count === played_count + unplayed_count
```
Add dev-mode assertions to verify this invariant.

### 5. INNER JOIN for Filtering
When filtering by related table fields, use `!inner`:
```typescript
// ✅ Correct - ensures INNER JOIN
.select('*, musicdb!inner(*)')
.eq('musicdb.playstyle', 'SP')

// ❌ Wrong - LEFT JOIN returns null relations
.select('*, musicdb(*)')
.eq('musicdb.playstyle', 'SP')
```

---

## Pre-Change Checklist

Before modifying data fetching or display logic:

- [ ] Does this query use `musicdb_id`/`chart.id` for matching?
- [ ] Does pagination have deterministic ordering (timestamp + id)?
- [ ] Does filtering use `!inner` join modifier?
- [ ] Are counts derived from the same filtered dataset?
- [ ] Is there a dev-mode assertion for count invariants?

---

## Post-Change Verification

After any data-related changes:

- [ ] Level 14: Total + No Play = 253 (catalog count)
- [ ] Level 11: Total + No Play = 382 (catalog count)
- [ ] Navigate away and back - counts stay consistent
- [ ] Upload new scores - counts update correctly
- [ ] Check browser console for integrity warnings

---

## Common Bugs & Fixes

### Bug: Counts differ between pages
**Cause**: Different pages using different matching logic
**Fix**: All pages must use `useScores()` context, not local queries

### Bug: "No Play" count too high
**Cause**: Composite key matching fails on null fields
**Fix**: Use `playedMusicDbIds.has(chart.id)` instead of string matching

### Bug: Duplicate scores appearing
**Cause**: Pagination without secondary sort key
**Fix**: Add `.order('id', { ascending: true })` after timestamp sort

### Bug: Filtered results incorrect with pagination
**Cause**: LEFT JOIN returns null relations that fill page limit
**Fix**: Use `musicdb!inner(...)` for INNER JOIN behavior

---

## Dev-Mode Assertions

Add to any component showing counts:

```typescript
import { assertCountIntegrity } from '@/lib/dataIntegrity';

// After calculating counts:
assertCountIntegrity(
  `ComponentName (Level ${level})`,
  catalogCount,
  playedCount,
  unplayedCount
);
```

---

## Architecture References

- **Types**: `src/types/scores.ts` (single source of truth)
- **Filter logic**: `src/lib/filterMatcher.ts`
- **Data fetching**: `src/hooks/useUserScores.ts`
- **Score context**: `src/contexts/ScoresContext.tsx`
- **MusicDB cache**: `src/hooks/useMusicDb.ts`

See `docs/architecture-rules.md` for the complete architecture documentation.
