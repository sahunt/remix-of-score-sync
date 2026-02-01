import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScoreWithSong } from '@/types/scores';
import type { FilterRule } from '@/components/filters/filterTypes';

/**
 * Shared hook for fetching user scores with consistent field selection.
 * This ensures all components get the same score data structure, preventing
 * mismatches in progress calculations between different views.
 * 
 * ARCHITECTURE: Chart metadata (difficulty_level, difficulty_name, playstyle)
 * is ALWAYS pulled from musicdb via the relation - this is the SINGLE SOURCE OF TRUTH.
 * The redundant columns in user_scores are ignored.
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
    staleTime: 5 * 60 * 1000,
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
        // ARCHITECTURE: Chart metadata comes from musicdb (SINGLE SOURCE OF TRUTH)
        // - difficulty_level, difficulty_name, playstyle from musicdb relation
        // - score, rank, flare, halo from user_scores (user achievements)
        // 
        // CRITICAL: Use !inner to ensure INNER JOIN behavior. Without it, PostgREST
        // performs a LEFT JOIN that returns ALL parent rows with musicdb: null for
        // non-matching relations, breaking pagination when filtering by level/difficulty.
        let query = supabase
          .from('user_scores')
          .select(`
            id,
            score,
            timestamp,
            rank,
            flare,
            halo,
            source_type,
            musicdb_id,
            musicdb!inner(
              name, artist, eamuse_id, song_id, deleted, era, name_romanized,
              difficulty_name, difficulty_level, playstyle
            )
          `)
          .eq('user_id', user.id)
          // Filter by playstyle via the musicdb relation (source of truth)
          .eq('musicdb.playstyle', 'SP');
        
        // Apply level filter via musicdb relation (source of truth)
        if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
          if (levelRule.operator === 'is') {
            query = query.in('musicdb.difficulty_level', levelRule.value as number[]);
          } else if (levelRule.operator === 'is_not') {
            for (const level of levelRule.value as number[]) {
              query = query.neq('musicdb.difficulty_level', level);
            }
          }
        } else if (levelRule?.operator === 'is_between' && Array.isArray(levelRule.value) && levelRule.value.length === 2) {
          const [min, max] = levelRule.value as [number, number];
          query = query.gte('musicdb.difficulty_level', Math.min(min, max)).lte('musicdb.difficulty_level', Math.max(min, max));
        }
        
        // Apply difficulty filter via musicdb relation (source of truth)
        if (difficultyRule && Array.isArray(difficultyRule.value) && difficultyRule.value.length > 0) {
          const diffs = (difficultyRule.value as string[]).map(d => d.toUpperCase());
          if (difficultyRule.operator === 'is') {
            query = query.in('musicdb.difficulty_name', diffs);
          } else if (difficultyRule.operator === 'is_not') {
            for (const diff of diffs) {
              query = query.neq('musicdb.difficulty_name', diff);
            }
          }
        }
        
        const { data, error } = await query
          .order('timestamp', { ascending: false, nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter out scores where musicdb is null or deleted
          // Also flatten musicdb fields for backward compatibility
          const validScores = (data as any[])
            .filter(score => score.musicdb !== null && score.musicdb.deleted !== true)
            .map(score => ({
              id: score.id,
              score: score.score,
              timestamp: score.timestamp,
              rank: score.rank,
              flare: score.flare,
              halo: score.halo,
              source_type: score.source_type,
              musicdb_id: score.musicdb_id,
              // Flatten chart metadata from musicdb for compatibility with existing code
              playstyle: score.musicdb.playstyle,
              difficulty_name: score.musicdb.difficulty_name,
              difficulty_level: score.musicdb.difficulty_level,
              // Keep full musicdb relation for components that use it
              musicdb: score.musicdb,
            })) as ScoreWithSong[];
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
