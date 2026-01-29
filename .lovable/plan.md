
# Jacket Art Integration Plan

## Overview
Integrate ~1,300 song jacket images from the uploaded ZIP file (`ddr_jacket_art.zip`) into the application. Images are named by `eamuse_id` and will appear wherever song details are displayed, replacing the current placeholder music note icon.

## Current State

| Component | Current Behavior |
|-----------|-----------------|
| `SongCard` | Shows 38x38px placeholder with music note icon |
| `Scores.tsx` | Fetches `musicdb(name, artist)` - missing `eamuse_id` |
| `GoalDetail.tsx` | Fetches `musicdb(name, artist)` - missing `eamuse_id` |
| Goal list components | Display SongCard without image data |
| Storage | Only `score-uploads` bucket exists (private) |

## Implementation Phases

### Phase 1: Storage Infrastructure
Create a public storage bucket `song-jackets` for serving images directly to users.

**Database Migration:**
- Create bucket `song-jackets` with `public = true`
- Add RLS policy for public read access
- Add RLS policy for service role uploads (for edge function)

### Phase 2: ZIP Extraction Edge Function
Create `extract-jackets` edge function that:
1. Downloads ZIP from `score-uploads` bucket
2. Uses JSZip to extract images in memory
3. Uploads each image to `song-jackets` bucket
4. Returns progress/error report

**Key considerations:**
- Use `EdgeRuntime.waitUntil()` for background processing (ZIP is large)
- Return 202 Accepted immediately, process in background
- Batch uploads to avoid timeouts
- Log progress for debugging

### Phase 3: Utility Function
Create `src/lib/jacketUrl.ts` with helper to construct URLs:
- Primary: Try `eamuse_id.png`
- Fallback: Try `song_id.png` (for future uploads)
- Returns `null` if neither available

### Phase 4: Update SongCard Component
Modify `SongCard.tsx`:
- Add `eamuseId?: string | null` and `songId?: number | null` props
- Render `<img>` with `onError` fallback chain
- Keep existing ♪ placeholder as final fallback
- Use `object-cover` to fill the 38x38px container

### Phase 5: Update Data Queries
Extend queries to include `eamuse_id` and `song_id` from `musicdb`:

**Files to update:**
| File | Change |
|------|--------|
| `src/pages/Scores.tsx` | Add `eamuse_id, song_id` to musicdb select |
| `src/pages/GoalDetail.tsx` | Add `eamuse_id, song_id` to musicdb select |
| `src/hooks/useGoalProgress.ts` | Add `eamuse_id, song_id` to `ScoreWithSong` interface |

### Phase 6: Update SongCard Consumers
Pass the new props to SongCard in all locations:

| File | Update |
|------|--------|
| `src/pages/Scores.tsx` | Pass `eamuseId`, `songId` to SongCard |
| `src/components/goals/CompletedSongsList.tsx` | Pass `eamuseId`, `songId` |
| `src/components/goals/RemainingSongsList.tsx` | Pass `eamuseId`, `songId` |
| `src/components/goals/SuggestionsList.tsx` | Pass `eamuseId`, `songId` |

---

## Technical Details

### Edge Function: `extract-jackets`

```text
Input:  POST { "zip_path": "ddr_jacket_art.zip" }
        
Process:
  1. Download ZIP from score-uploads bucket
  2. Parse with JSZip
  3. For each file:
     - Extract filename (e.g., "lIlQ1DbODqi8Qqd0bQqP1dD9iPPiQd80.png")
     - Upload to song-jackets/{filename}
  4. Track success/failure

Output: { 
  "status": "complete",
  "total": 1300, 
  "uploaded": 1295, 
  "failed": 5,
  "errors": ["file.png: reason", ...]
}
```

### Image Fallback Chain in SongCard

```text
1. Try: /storage/v1/object/public/song-jackets/{eamuse_id}.png
   |
   v (onError)
2. Try: /storage/v1/object/public/song-jackets/{song_id}.png  
   |
   v (onError)
3. Show: ♪ placeholder icon
```

### Jacket URL Helper

```typescript
// src/lib/jacketUrl.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function getJacketUrl(eamuseId: string | null, songId?: number | null): string | null {
  if (eamuseId) {
    return `${SUPABASE_URL}/storage/v1/object/public/song-jackets/${eamuseId}.png`;
  }
  if (songId) {
    return `${SUPABASE_URL}/storage/v1/object/public/song-jackets/${songId}.png`;
  }
  return null;
}
```

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create `song-jackets` bucket + policies |
| `supabase/functions/extract-jackets/index.ts` | Create new edge function |
| `supabase/config.toml` | Add function config |
| `src/lib/jacketUrl.ts` | Create utility |
| `src/components/scores/SongCard.tsx` | Add image support with fallback |
| `src/hooks/useGoalProgress.ts` | Add `eamuse_id`, `song_id` to types |
| `src/pages/Scores.tsx` | Update query + pass props |
| `src/pages/GoalDetail.tsx` | Update query |
| `src/components/goals/CompletedSongsList.tsx` | Pass image props |
| `src/components/goals/RemainingSongsList.tsx` | Pass image props |
| `src/components/goals/SuggestionsList.tsx` | Pass image props |

---

## Execution Order

1. **Database migration** - Create `song-jackets` bucket
2. **Create edge function** - Build and deploy `extract-jackets`
3. **Upload ZIP** - Move `ddr_jacket_art.zip` to `score-uploads` bucket
4. **Run extraction** - Call edge function to populate bucket
5. **Create utility** - Add `jacketUrl.ts` helper
6. **Update SongCard** - Add image rendering with fallback
7. **Update queries** - Include `eamuse_id` in all data fetches
8. **Update consumers** - Pass props to all SongCard usages
9. **Test** - Verify images appear on Scores and Goal pages
