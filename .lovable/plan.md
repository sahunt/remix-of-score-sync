
# Simplify Caching Architecture

## ✅ COMPLETED

Reduced from 9 separate caches to 3 core caches to fix data inconsistency issues.

---

## Changes Made

### Created
- `src/hooks/useMusicDb.ts` - Unified catalog cache with both flat array and song_id map

### Deleted
- `src/hooks/useUserStats.ts` - Stats now calculated client-side
- `src/hooks/useServerGoalProgress.ts` - Progress now calculated client-side
- `src/hooks/useMusicDbCount.ts` - Counts now derived from musicdb cache
- `src/hooks/useAllChartsCache.ts` - Merged into useMusicDb
- `src/hooks/useSongChartsCache.ts` - Merged into useMusicDb

### Modified
- `src/hooks/useUploadInvalidation.ts` - Simplified to 2 invalidations
- `src/pages/Scores.tsx` - Uses useMusicDb, client-side stats
- `src/pages/Home.tsx` - Uses useMusicDb, client-side goal progress
- `src/pages/GoalDetail.tsx` - Uses global scores context + useMusicDb
- `src/App.tsx` - Removed aggressive caching config
- `docs/architecture-rules.md` - Updated with new 3-cache architecture

---

## Final Architecture

| Cache | Purpose | Invalidation |
|-------|---------|--------------|
| `user-scores` | All user's played scores | After upload |
| `goals` | User's goal definitions | After goal CRUD |
| `musicdb` | Chart catalog (static) | Never |

All stats, progress, and counts are now derived client-side from these 3 caches.
