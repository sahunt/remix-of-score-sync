# Performance Audit: Edi (DDR Score Tracker)

## Status: ✅ Phase 1 Complete

Completed optimizations (Priority 1-4):
1. ✅ **Extract matchesRule** - Created `src/lib/filterMatcher.ts`
2. ✅ **Consolidate types** - Created `src/types/scores.ts`
3. ✅ **Integrate ScoresProvider** - Already in `AppLayout.tsx`
4. ✅ **Fix stats derivation** - Now uses `displayedScores` directly

---

## Remaining Optimizations (Priority 5-7)

### Issue #5: Reuse songChartsCache in GoalDetail
**Status:** Ready to implement
**Effort:** Medium | **Impact:** Medium (fewer queries)

GoalDetail.tsx fetches unplayed charts with a separate query, but `useSongChartsCache()` already caches all 10,000+ SP charts.

### Issue #6: Unify Scores.tsx with Global Cache
**Status:** Deferred - requires careful modal preloading consideration
**Effort:** High | **Impact:** High (network/memory)

The Scores page maintains local state for modal preloading sync. Unifying with global cache requires ensuring modal always shows data consistent with the displayed list.

### Issue #7: Server-side Goal Progress RPC
**Status:** Planned for Phase 4
**Effort:** High | **Impact:** High (scalability)

Create PostgreSQL function `calculate_goal_progress` to move goal calculations server-side.

---

## Files Created/Modified in Phase 1

| File | Action | Purpose |
|------|--------|---------|
| `src/types/scores.ts` | Created | Canonical type definitions |
| `src/lib/filterMatcher.ts` | Created | Centralized filter logic |
| `src/hooks/useGoalProgress.ts` | Updated | Uses shared filterMatcher |
| `src/hooks/useFilterResults.ts` | Updated | Uses shared filterMatcher |
| `src/pages/Scores.tsx` | Updated | Uses shared types/filter, optimized stats |
| `src/components/scores/FiltersSection.tsx` | Updated | Uses ScoreForFiltering type |
| `src/components/filters/FilterModal.tsx` | Updated | Uses ScoreForFiltering type |
| `src/components/filters/CreateFilterSheet.tsx` | Updated | Uses ScoreForFiltering type |

---

## Bundle Size Impact

Removed ~350 lines of duplicated filter matching logic across 3 files, replaced with single ~160 line utility.

**Estimated savings:** ~190 lines / ~4KB gzipped
