import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CachedChart {
  id: number;
  difficulty_name: string;
  difficulty_level: number;
}

/**
 * Fetches and caches ALL SP charts from musicdb, grouped by song_id.
 * This enables instant modal loading with all 5 difficulties per song.
 * 
 * The data is lightweight (~400KB for 10k charts with 3 fields each)
 * and cached for 30 minutes since musicdb rarely changes.
 */
export function useSongChartsCache() {
  return useQuery({
    queryKey: ['all-song-charts'],
    queryFn: async (): Promise<Map<number, CachedChart[]>> => {
      // Fetch ALL SP charts from musicdb
      // Only need minimal fields for modal display
      const PAGE_SIZE = 1000;
      let allCharts: { id: number; song_id: number; difficulty_name: string | null; difficulty_level: number | null }[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('musicdb')
          .select('id, song_id, difficulty_name, difficulty_level')
          .eq('playstyle', 'SP')
          .eq('deleted', false)
          .not('difficulty_level', 'is', null)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCharts = [...allCharts, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      // Build a Map: song_id -> chart[]
      const chartsBySong = new Map<number, CachedChart[]>();
      for (const chart of allCharts) {
        if (chart.difficulty_level === null) continue;
        
        const songCharts = chartsBySong.get(chart.song_id);
        const cachedChart: CachedChart = {
          id: chart.id,
          difficulty_name: chart.difficulty_name?.toUpperCase() ?? 'UNKNOWN',
          difficulty_level: chart.difficulty_level,
        };
        
        if (songCharts) {
          songCharts.push(cachedChart);
        } else {
          chartsBySong.set(chart.song_id, [cachedChart]);
        }
      }
      
      return chartsBySong;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - musicdb rarely changes
    gcTime: 60 * 60 * 1000,    // 1 hour
  });
}
