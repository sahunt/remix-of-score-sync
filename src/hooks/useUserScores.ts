import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScoreWithSong } from '@/hooks/useGoalProgress';
import type { FilterRule } from '@/components/filters/filterTypes';

/**
 * Shared hook for fetching user scores with consistent field selection.
 * This ensures all components get the same score data structure, preventing
 * mismatches in progress calculations between different views.
 * 
 * IMPORTANT: Always includes musicdb_id and musicdb relation fields
 * which are required for proper goal progress tracking and UI rendering.
 */
export function useUserScores(options?: {
  /** Optional filter rules to apply at the database level */
  filterRules?: FilterRule[];
  /** Whether the query should run */
  enabled?: boolean;
  /** Custom query key suffix for cache separation */
  queryKeySuffix?: string;
}) {
  const { user } = useAuth();
  const { filterRules = [], enabled = true, queryKeySuffix = '' } = options ?? {};

  // Extract level and difficulty filters for DB-level filtering
  const levelRule = filterRules.find(r => r.type === 'level');
  const difficultyRule = filterRules.find(r => r.type === 'difficulty');

  return useQuery({
    queryKey: ['user-scores', user?.id, queryKeySuffix, levelRule, difficultyRule],
    staleTime: 5 * 60 * 1000, // 5 minutes - leverage caching
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<ScoreWithSong[]> => {
      if (!user?.id) return [];
      
      // Supabase limits responses to 1000 rows per request
      // Must paginate to fetch all scores (users can have 4500+ scores)
      const PAGE_SIZE = 1000;
      let allScores: ScoreWithSong[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        // CRITICAL: Always select musicdb_id and full musicdb relation
        // These fields are required for:
        // 1. Goal progress calculations (matching played vs unplayed)
        // 2. Song card rendering (jacket art lookup via eamuse_id)
        // 3. Unique React keys (song_id)
        // 4. Filtering out deleted songs (deleted field)
        let query = supabase
          .from('user_scores')
          .select(`
            id,
            score,
            timestamp,
            playstyle,
            difficulty_name,
            difficulty_level,
            rank,
            flare,
            halo,
            musicdb_id,
            musicdb(name, artist, eamuse_id, song_id, deleted, era)
          `)
          .eq('user_id', user.id)
          .eq('playstyle', 'SP');
        
        // Apply level filter at DB level for efficiency
        if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
          if (levelRule.operator === 'is') {
            query = query.in('difficulty_level', levelRule.value as number[]);
          } else if (levelRule.operator === 'is_not') {
            for (const level of levelRule.value as number[]) {
              query = query.neq('difficulty_level', level);
            }
          }
        } else if (levelRule?.operator === 'is_between' && Array.isArray(levelRule.value) && levelRule.value.length === 2) {
          const [min, max] = levelRule.value as [number, number];
          query = query.gte('difficulty_level', Math.min(min, max)).lte('difficulty_level', Math.max(min, max));
        }
        
        // Apply difficulty filter at DB level for efficiency
        if (difficultyRule && Array.isArray(difficultyRule.value) && difficultyRule.value.length > 0) {
          const diffs = (difficultyRule.value as string[]).map(d => d.toUpperCase());
          if (difficultyRule.operator === 'is') {
            query = query.in('difficulty_name', diffs);
          } else if (difficultyRule.operator === 'is_not') {
            for (const diff of diffs) {
              query = query.neq('difficulty_name', diff);
            }
          }
        }
        
        const { data, error } = await query
          .order('timestamp', { ascending: false, nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter out scores linked to deleted songs
          // Scores are stored for all songs (including deleted), but only show non-deleted in UI
          const validScores = (data as any[]).filter(score => {
            // Keep score if musicdb exists and is not deleted
            return score.musicdb !== null && score.musicdb.deleted !== true;
          }) as ScoreWithSong[];
          allScores = [...allScores, ...validScores];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      return allScores;
    },
    enabled: enabled && !!user?.id,
  });
}
