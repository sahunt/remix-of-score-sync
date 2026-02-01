/**
 * Centralized filter matching logic for scores.
 * 
 * This module is the SINGLE SOURCE OF TRUTH for filter rule matching.
 * Used by:
 * - Scores.tsx (main scores list filtering)
 * - useFilterResults.ts (filter preview counts)
 * - useGoalProgress.ts (goal progress calculations)
 * 
 * IMPORTANT: Any changes to filter logic must be made here only.
 */

import type { FilterRule } from '@/components/filters/filterTypes';
import type { ScoreForFiltering } from '@/types/scores';

/**
 * Check if a score matches a single filter rule.
 * Handles all rule types: score, level, grade, lamp, flare, difficulty, title, era.
 */
export function matchesFilterRule(score: ScoreForFiltering, rule: FilterRule): boolean {
  const { type, operator, value } = rule;

  // If value is null/empty, skip this rule (treat as "no filter")
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;

  // Handle numeric comparisons (score only uses single values or ranges)
  const compareNumeric = (actual: number | null, target: number | [number, number]): boolean => {
    if (actual === null) return false;
    
    // Range comparison for "is_between"
    if (Array.isArray(target) && target.length === 2) {
      const [min, max] = target;
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    const singleTarget = typeof target === 'number' ? target : target[0];
    switch (operator) {
      case 'is': return actual === singleTarget;
      case 'is_not': return actual !== singleTarget;
      case 'less_than': return actual < singleTarget;
      case 'greater_than': return actual > singleTarget;
      default: return false;
    }
  };

  // Handle numeric multi-select (level, flare)
  // Special case: value 0 for flare means "no flare" (null in DB)
  const compareNumericMulti = (actual: number | null, target: number | number[] | [number, number]): boolean => {
    // Range comparison for "is_between"
    if (operator === 'is_between' && Array.isArray(target) && target.length === 2) {
      if (actual === null) return false;
      const [min, max] = target as [number, number];
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    // Multi-select array
    if (Array.isArray(target)) {
      if (target.length === 0) return true; // Empty selection = no filter
      
      // Check if "no flare" (0) is in the target array
      const includesNoFlare = target.includes(0);
      
      if (actual === null) {
        // null flare matches "no flare" (0) selection
        const matches = includesNoFlare;
        return operator === 'is' ? matches : !matches;
      }
      
      const matches = target.includes(actual);
      return operator === 'is' ? matches : !matches;
    }
    
    // Single value - treat 0 as "no flare"
    if (target === 0) {
      const matches = actual === null;
      return operator === 'is' ? matches : !matches;
    }
    
    if (actual === null) return false;
    
    // Single value
    switch (operator) {
      case 'is': return actual === target;
      case 'is_not': return actual !== target;
      case 'less_than': return actual < target;
      case 'greater_than': return actual > target;
      default: return false;
    }
  };

  // Handle string multi-select (grade, lamp, difficulty)
  const compareStringMulti = (actual: string | null, target: string | string[]): boolean => {
    if (actual === null) return false;
    const normalizedActual = actual.toLowerCase();
    
    // Multi-select array
    if (Array.isArray(target)) {
      if (target.length === 0) return true; // Empty selection = no filter
      const matches = target.some(t => normalizedActual === t.toLowerCase());
      return operator === 'is' ? matches : !matches;
    }
    
    // Single string value
    if (target === '') return true; // Empty string = no filter
    const normalizedTarget = target.toLowerCase();
    switch (operator) {
      case 'is': return normalizedActual === normalizedTarget;
      case 'is_not': return normalizedActual !== normalizedTarget;
      case 'contains': return normalizedActual.includes(normalizedTarget);
      default: return false;
    }
  };

  switch (type) {
    case 'score': 
      return compareNumeric(score.score, value as number | [number, number]);
    case 'level': 
      return compareNumericMulti(score.difficulty_level, value as number | number[] | [number, number]);
    case 'flare': 
      return compareNumericMulti(score.flare, value as number | number[] | [number, number]);
    case 'grade': 
      return compareStringMulti(score.rank, value as string | string[]);
    case 'lamp': 
      return compareStringMulti(score.halo, value as string | string[]);
    case 'difficulty': 
      return compareStringMulti(score.difficulty_name, value as string | string[]);
    case 'title': 
      return compareStringMulti(score.musicdb?.name ?? '', value as string);
    case 'version':
      return true; // Placeholder - version filtering not yet implemented
    case 'era': {
      const songEra = score.musicdb?.era;
      // Multi-select array comparison
      if (Array.isArray(value)) {
        if (value.length === 0) return true; // Empty = no filter
        if (songEra === null || songEra === undefined) return false;
        const matches = (value as number[]).includes(songEra);
        return operator === 'is' ? matches : !matches;
      }
      // Single value
      if (songEra === null || songEra === undefined) return false;
      const singleValue = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(singleValue)) return true;
      switch (operator) {
        case 'is': return songEra === singleValue;
        case 'is_not': return songEra !== singleValue;
        default: return true;
      }
    }
    default:
      return true;
  }
}

/**
 * Filter an array of scores by multiple rules.
 * 
 * @param scores - Array of scores to filter
 * @param rules - Filter rules to apply
 * @param matchMode - 'all' requires all rules to match, 'any' requires at least one
 * @returns Filtered array of scores
 */
export function filterScoresByRules<T extends ScoreForFiltering>(
  scores: T[],
  rules: FilterRule[],
  matchMode: 'all' | 'any'
): T[] {
  if (!rules || rules.length === 0) {
    return scores;
  }

  return scores.filter((score) => {
    if (matchMode === 'all') {
      return rules.every((rule) => matchesFilterRule(score, rule));
    } else {
      return rules.some((rule) => matchesFilterRule(score, rule));
    }
  });
}
