import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Chart info for filtering and goal calculations.
 */
export interface MusicDbChart {
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
 * Minimal chart info for modal display (grouped by song_id).
 */
export interface CachedChart {
  id: number;
  difficulty_name: string;
  difficulty_level: number;
}

interface MusicDbData {
  /** Flat array of all SP charts for filtering and goal calculations */
  charts: MusicDbChart[];
  /** Map of song_id -> charts for instant modal lookup */
  bySongId: Map<number, CachedChart[]>;
}

/**
 * Unified MusicDB cache that provides both:
 * 1. Flat chart array for filtering, goal calculations, and "no play" counts
 * 2. Song-grouped chart map for instant modal population
 * 
 * This replaces both useAllChartsCache and useSongChartsCache with a single cache.
 * The catalog is static (only changes on admin import), so we set staleTime: Infinity.
 */
export function useMusicDb() {
  return useQuery<MusicDbData>({
    queryKey: ['musicdb'],
    queryFn: async (): Promise<MusicDbData> => {
      const PAGE_SIZE = 1000;
      let allCharts: MusicDbChart[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('musicdb')
          .select('id, song_id, name, artist, eamuse_id, difficulty_name, difficulty_level, playstyle, name_romanized, era')
          .eq('playstyle', 'SP')
          .eq('deleted', false)
          .not('difficulty_level', 'is', null)
          // CRITICAL: Order by id for deterministic pagination - prevents duplicates across pages
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCharts = [...allCharts, ...data as MusicDbChart[]];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      // Build song_id -> charts map for modal display
      // Deduplicate by difficulty_name to ensure only one entry per difficulty per song
      const bySongId = new Map<number, CachedChart[]>();
      for (const chart of allCharts) {
        if (chart.difficulty_level === null || chart.difficulty_name === null) continue;
        
        const normalizedDifficulty = chart.difficulty_name.toUpperCase();
        const cachedChart: CachedChart = {
          id: chart.id,
          difficulty_name: normalizedDifficulty,
          difficulty_level: chart.difficulty_level,
        };
        
        const existing = bySongId.get(chart.song_id);
        if (existing) {
          // Check for duplicate difficulty_name before adding
          const hasDuplicate = existing.some(c => c.difficulty_name === normalizedDifficulty);
          if (!hasDuplicate) {
            existing.push(cachedChart);
          }
        } else {
          bySongId.set(chart.song_id, [cachedChart]);
        }
      }

      return { charts: allCharts, bySongId };
    },
    staleTime: Infinity, // Never stale - catalog only changes via admin import
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  });
}

/**
 * Filter charts by goal criteria (level and difficulty rules).
 * Used to identify which charts match a goal's criteria.
 */
export function filterChartsByCriteria(
  charts: MusicDbChart[],
  levelRule?: { operator: string; value: number[] | [number, number] } | null,
  difficultyRule?: { operator: string; value: string[] } | null
): MusicDbChart[] {
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
