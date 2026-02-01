import { useMemo } from 'react';
import type { FilterRule } from '@/components/filters/filterTypes';
import { matchesFilterRule, filterScoresByRules } from '@/lib/filterMatcher';
import type { ScoreForFiltering } from '@/types/scores';

/**
 * Hook to filter scores by rules and return count + filtered results.
 * Uses the centralized filterMatcher for consistent behavior.
 */
export function useFilterResults(
  scores: ScoreForFiltering[],
  rules: FilterRule[],
  matchMode: 'all' | 'any'
): { count: number; filteredScores: ScoreForFiltering[] } {
  return useMemo(() => {
    if (rules.length === 0) {
      return { count: scores.length, filteredScores: scores };
    }

    const filteredScores = filterScoresByRules(scores, rules, matchMode);

    return { count: filteredScores.length, filteredScores };
  }, [scores, rules, matchMode]);
}

// Re-export matchesFilterRule for components that need single-rule matching
export { matchesFilterRule };
