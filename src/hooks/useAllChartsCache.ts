import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChartInfo } from '@/types/scores';

/**
 * Extended chart info with additional fields needed for goal filtering.
 */
export interface FullChartInfo extends ChartInfo {
  id: number;
  song_id: number;
  name: string | null;
  artist: string | null;
  eamuse_id: string | null;
  difficulty_name: string | null;
  difficulty_level: number | null;
  playstyle: string | null;
  name_romanized: string | null;
  era: number | null;
}

/**
 * Fetches and caches ALL SP charts from musicdb as a flat array.
 * This is used for goal progress calculations to identify unplayed charts.
 * 
 * Unlike useSongChartsCache (which groups by song_id for modal display),
 * this returns a flat array with full chart metadata for filtering.
 * 
 * The data is cached for 30 minutes since musicdb rarely changes.
 */
export function useAllChartsCache() {
  return useQuery({
    queryKey: ['all-charts-flat'],
    queryFn: async (): Promise<FullChartInfo[]> => {
      const PAGE_SIZE = 1000;
      let allCharts: FullChartInfo[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('musicdb')
          .select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized, era')
          .eq('playstyle', 'SP')
          .eq('deleted', false)
          .not('difficulty_level', 'is', null)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCharts = [...allCharts, ...data as FullChartInfo[]];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allCharts;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - musicdb rarely changes
    gcTime: 60 * 60 * 1000,    // 1 hour
  });
}

/**
 * Filter charts by goal criteria (level and difficulty rules).
 * Used to identify which charts match a goal's criteria.
 */
export function filterChartsByCriteria(
  charts: FullChartInfo[],
  levelRule?: { operator: string; value: number[] | [number, number] } | null,
  difficultyRule?: { operator: string; value: string[] } | null
): FullChartInfo[] {
  let filtered = charts;

  // Apply level filter
  if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
    if (levelRule.operator === 'is') {
      filtered = filtered.filter(c => 
        c.difficulty_level !== null && (levelRule.value as number[]).includes(c.difficulty_level)
      );
    } else if (levelRule.operator === 'is_not') {
      filtered = filtered.filter(c => 
        c.difficulty_level !== null && !(levelRule.value as number[]).includes(c.difficulty_level)
      );
    } else if (levelRule.operator === 'is_between' && levelRule.value.length === 2) {
      const [min, max] = levelRule.value as [number, number];
      filtered = filtered.filter(c => 
        c.difficulty_level !== null && 
        c.difficulty_level >= Math.min(min, max) && 
        c.difficulty_level <= Math.max(min, max)
      );
    }
  }

  // Apply difficulty filter
  if (difficultyRule && Array.isArray(difficultyRule.value) && difficultyRule.value.length > 0) {
    const diffs = difficultyRule.value.map(d => d.toUpperCase());
    if (difficultyRule.operator === 'is') {
      filtered = filtered.filter(c => 
        c.difficulty_name !== null && diffs.includes(c.difficulty_name.toUpperCase())
      );
    } else if (difficultyRule.operator === 'is_not') {
      filtered = filtered.filter(c => 
        c.difficulty_name !== null && !diffs.includes(c.difficulty_name.toUpperCase())
      );
    }
  }

  return filtered;
}
