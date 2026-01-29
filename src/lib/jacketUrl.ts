const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Constructs the public URL for a song jacket image.
 * Tries eamuse_id first, then falls back to song_id.
 * Returns null if neither is available.
 */
export function getJacketUrl(eamuseId: string | null | undefined, songId?: number | null): string | null {
  if (eamuseId) {
    return `${SUPABASE_URL}/storage/v1/object/public/song-jackets/${eamuseId}.png`;
  }
  if (songId) {
    return `${SUPABASE_URL}/storage/v1/object/public/song-jackets/${songId}.png`;
  }
  return null;
}

/**
 * Returns the fallback URL for a song jacket (uses song_id).
 * Used when the primary eamuse_id image fails to load.
 */
export function getJacketFallbackUrl(songId: number | null | undefined): string | null {
  if (songId) {
    return `${SUPABASE_URL}/storage/v1/object/public/song-jackets/${songId}.png`;
  }
  return null;
}
