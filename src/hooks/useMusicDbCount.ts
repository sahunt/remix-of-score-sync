import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FilterRule } from '@/components/filters/filterTypes';

/**
 * Builds a Supabase query with filters applied server-side.
 * This avoids row limits by letting the database do the filtering and counting.
 */
async function getFilteredCount(
  rules: FilterRule[],
  matchMode: 'all' | 'any'
): Promise<number> {
  // Extract level and difficulty filters (the only ones that apply to musicdb)
  const levelRule = rules.find(r => r.type === 'level');
  const difficultyRule = rules.find(r => r.type === 'difficulty');

  // Build base query - use head:true to only get count, not rows
  // Filter to SP (Single Play) only - app doesn't support DP yet
  // Exclude deleted songs from catalog counts
  let query = supabase
    .from('musicdb')
    .select('*', { count: 'exact', head: true })
    .not('difficulty_level', 'is', null)
    .eq('playstyle', 'SP')
    .eq('deleted', false);

  // Apply level filter server-side
  if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
    const levels = levelRule.value as number[];
    if (levelRule.operator === 'is') {
      query = query.in('difficulty_level', levels);
    } else if (levelRule.operator === 'is_not') {
      // For "is_not", we need to exclude these levels
      for (const level of levels) {
        query = query.neq('difficulty_level', level);
      }
    }
  } else if (levelRule && levelRule.operator === 'is_between' && Array.isArray(levelRule.value) && levelRule.value.length === 2) {
    const [min, max] = levelRule.value as [number, number];
    query = query.gte('difficulty_level', Math.min(min, max)).lte('difficulty_level', Math.max(min, max));
  }

  // Apply difficulty filter server-side
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

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
}

/**
 * Fetches the count of charts in musicdb that match the given criteria rules.
 * Uses server-side filtering and counting to avoid row limits.
 */
export function useMusicDbCount(
  rules: FilterRule[],
  matchMode: 'all' | 'any' = 'all',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['musicdb-count', rules, matchMode],
    queryFn: async () => {
      const total = await getFilteredCount(rules, matchMode);
      return { total, charts: [] }; // Charts array not needed for counting
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since musicdb rarely changes
  });
}

/**
 * Non-hook version for use in components that need counts for multiple goals
 */
export async function fetchMusicDbCount(
  rules: FilterRule[],
  matchMode: 'all' | 'any' = 'all'
): Promise<number> {
  return getFilteredCount(rules, matchMode);
}
