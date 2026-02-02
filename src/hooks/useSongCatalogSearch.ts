import { useMemo } from 'react';
import { useAllChartsCache, type FullChartInfo } from '@/hooks/useAllChartsCache';

export interface SongSearchResult {
  songId: number;
  name: string;
  artist: string | null;
  eamuseId: string | null;
}

/**
 * Hook to search the full song catalog (musicdb).
 * Searches by name, artist, and name_romanized fields.
 * Returns deduplicated songs (not charts).
 */
export function useSongCatalogSearch(query: string): {
  results: SongSearchResult[];
  isLoading: boolean;
} {
  const { data: allCharts = [], isLoading } = useAllChartsCache();

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || allCharts.length === 0) {
      return [];
    }

    // Create a map to deduplicate by song_id
    const songMap = new Map<number, SongSearchResult>();

    for (const chart of allCharts) {
      if (chart.song_id === null) continue;
      
      // Skip if we've already added this song
      if (songMap.has(chart.song_id)) continue;

      // Match against name, artist, and name_romanized (same as Scores page)
      const name = chart.name?.toLowerCase() ?? '';
      const artist = chart.artist?.toLowerCase() ?? '';
      const nameRomanized = chart.name_romanized?.toLowerCase() ?? '';
      
      if (name.includes(trimmed) || artist.includes(trimmed) || nameRomanized.includes(trimmed)) {
        songMap.set(chart.song_id, {
          songId: chart.song_id,
          name: chart.name ?? 'Unknown Song',
          artist: chart.artist,
          eamuseId: chart.eamuse_id,
        });
      }
    }

    // Convert to array and sort by name
    return Array.from(songMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [query, allCharts]);

  return { results, isLoading };
}
