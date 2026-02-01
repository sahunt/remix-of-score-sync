

# Architecture Fix: Single Source of Truth for Chart Metadata

## Current Problem

The `user_scores` table stores **redundant copies** of chart metadata that already exists in `musicdb`:

| Column | In `user_scores` | In `musicdb` | Should Be In |
|--------|------------------|--------------|--------------|
| `difficulty_level` | Yes (redundant) | Yes (source of truth) | musicdb only |
| `difficulty_name` | Yes (redundant) | Yes (source of truth) | musicdb only |
| `playstyle` | Yes (redundant) | Yes (source of truth) | musicdb only |
| `song_id` | Yes (redundant) | Yes (via lookup) | musicdb only |
| `chart_id` | Yes (redundant) | Yes (source of truth) | musicdb only |
| `score` | Yes | No | user_scores |
| `rank` | Yes | No | user_scores |
| `flare` | Yes | No | user_scores |
| `halo` | Yes | No | user_scores |

This redundancy caused the bug you experienced: `musicdb` had placeholder values (1), but `user_scores` had correct values (14) captured at import time. Different code paths queried different tables, causing mismatches.

---

## Solution: Query Through `musicdb` for Chart Metadata

Rather than dropping columns (risky migration), we update **all queries** to pull chart metadata from `musicdb` via the existing `musicdb_id` foreign key relationship.

**After this fix:**
- Chart metadata (`difficulty_level`, `difficulty_name`, `playstyle`) always comes from `musicdb`
- User achievement data (`score`, `rank`, `flare`, `halo`) comes from `user_scores`
- The redundant columns in `user_scores` are ignored but preserved for backward compatibility

---

## Changes Required

### Phase 1: Fix Immediate Data Issue (Database Migration)

Update the 3 songs with incorrect placeholder difficulty levels in `musicdb`:

```sql
UPDATE musicdb SET difficulty_level = 11 
WHERE song_id = 38776 AND difficulty_name = 'DIFFICULT' AND playstyle = 'SP';

UPDATE musicdb SET difficulty_level = 11 
WHERE song_id = 38798 AND difficulty_name = 'EXPERT' AND playstyle = 'SP';

UPDATE musicdb SET difficulty_level = 14 
WHERE song_id = 38870 AND difficulty_name = 'EXPERT' AND playstyle = 'SP';
```

### Phase 2: Update Query Layer (Frontend Hooks)

#### 2.1 Update `useUserScores.ts`

**Current:** Selects `difficulty_level`, `difficulty_name`, `playstyle` from `user_scores` table directly.

**Fixed:** Pull these fields from the `musicdb` relation instead:

```typescript
// BEFORE
.select(`
  id, score, timestamp,
  playstyle,           // ← from user_scores (redundant)
  difficulty_name,     // ← from user_scores (redundant)
  difficulty_level,    // ← from user_scores (redundant)
  rank, flare, halo, musicdb_id,
  musicdb(name, artist, eamuse_id, song_id, deleted, era)
`)

// AFTER
.select(`
  id, score, timestamp,
  rank, flare, halo, musicdb_id, source_type,
  musicdb(
    name, artist, eamuse_id, song_id, deleted, era,
    difficulty_name, difficulty_level, playstyle
  )
`)
```

Then flatten the musicdb fields in the response mapping so existing code continues to work.

#### 2.2 Update `ScoreWithSong` Type in `types/scores.ts`

Add the chart fields to the musicdb relation:

```typescript
musicdb?: {
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  song_id: number | null;
  name_romanized?: string | null;
  era: number | null;
  deleted?: boolean | null;
  // Add chart metadata
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
} | null;
```

#### 2.3 Update `useAllChartsCache.ts` and `useSongChartsCache.ts`

These already query from `musicdb` - no changes needed. They are the source of truth for chart data.

#### 2.4 Update Query Filters

**Problem:** The current filter code filters on `user_scores.difficulty_level`. Since we now want musicdb to be the source of truth, we need to filter via the relation.

**Solution:** Supabase PostgREST supports filtering on related tables:

```typescript
// Instead of:
query = query.in('difficulty_level', levelRule.value);

// Use:
query = query.in('musicdb.difficulty_level', levelRule.value);
```

### Phase 3: Update Upload Process (Edge Function)

#### 3.1 Stop Writing Redundant Fields (Optional - Future)

The `process-upload` function currently writes `difficulty_level`, `difficulty_name`, `playstyle`, `song_id`, `chart_id` to `user_scores`. 

For now, we keep writing these for backward compatibility. A future cleanup could remove this, but it's low priority since:
1. They aren't used if queries are fixed
2. Having the data doesn't hurt, just wastes a tiny bit of storage

---

## Architecture After Fix

```text
┌─────────────────────────────────────────────────────────────────┐
│  musicdb (SOURCE OF TRUTH)                                      │
│  ├── id (PK - referenced by user_scores.musicdb_id)             │
│  ├── song_id                                                    │
│  ├── difficulty_name  ← ALWAYS use this                         │
│  ├── difficulty_level ← ALWAYS use this                         │
│  ├── playstyle        ← ALWAYS use this                         │
│  ├── name, artist, eamuse_id, era, etc.                         │
│  └── deleted                                                    │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │ musicdb_id
                          │
┌─────────────────────────────────────────────────────────────────┐
│  user_scores (USER ACHIEVEMENTS)                                │
│  ├── id (PK)                                                    │
│  ├── user_id                                                    │
│  ├── musicdb_id (FK) ── links to musicdb for chart metadata     │
│  ├── score         ← user achievement                           │
│  ├── rank          ← user achievement                           │
│  ├── flare         ← user achievement                           │
│  ├── halo          ← user achievement                           │
│  ├── source_type   ← upload metadata                            │
│  └── timestamp     ← upload metadata                            │
│                                                                 │
│  (deprecated - preserved but ignored):                          │
│  ├── difficulty_level, difficulty_name, playstyle               │
│  └── song_id, chart_id                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Fix 3 incorrect difficulty levels in musicdb |
| `src/hooks/useUserScores.ts` | Query chart fields from `musicdb` relation; flatten in response |
| `src/types/scores.ts` | Add chart fields to `musicdb` relation type |
| `docs/architecture-rules.md` | Add rule: "Chart metadata comes from musicdb, not user_scores" |

---

## Benefits

1. **Single source of truth** - All chart metadata comes from `musicdb`
2. **Prevents future data drift** - Updates to `musicdb` automatically apply everywhere
3. **Simpler debugging** - Only one place to look for chart data
4. **Backward compatible** - No need to drop columns or migrate data

