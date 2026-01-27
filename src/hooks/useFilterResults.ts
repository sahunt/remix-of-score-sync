import { useMemo } from 'react';
import type { FilterRule } from '@/components/filters/filterTypes';

interface ScoreData {
  score: number | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  rank: string | null;
  halo: string | null;
  flare: number | null;
  musicdb: { name: string | null; artist: string | null } | null;
}

function matchesRule(score: ScoreData, rule: FilterRule): boolean {
  const { type, operator, value } = rule;

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
  const compareNumericMulti = (actual: number | null, target: number | number[] | [number, number]): boolean => {
    if (actual === null) return false;
    
    // Range comparison for "is_between"
    if (operator === 'is_between' && Array.isArray(target) && target.length === 2) {
      const [min, max] = target as [number, number];
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    // Multi-select array
    if (Array.isArray(target)) {
      const matches = target.includes(actual);
      return operator === 'is' ? matches : !matches;
    }
    
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
      const matches = target.some(t => normalizedActual === t.toLowerCase());
      return operator === 'is' ? matches : !matches;
    }
    
    // Single string value
    const normalizedTarget = target.toLowerCase();
    switch (operator) {
      case 'is': return normalizedActual === normalizedTarget;
      case 'is_not': return normalizedActual !== normalizedTarget;
      case 'contains': return normalizedActual.includes(normalizedTarget);
      default: return false;
    }
  };

  switch (type) {
    case 'score': return compareNumeric(score.score, value as number | [number, number]);
    case 'level': return compareNumericMulti(score.difficulty_level, value as number | number[] | [number, number]);
    case 'flare': return compareNumericMulti(score.flare, value as number | number[] | [number, number]);
    case 'grade': return compareStringMulti(score.rank, value as string | string[]);
    case 'lamp': return compareStringMulti(score.halo, value as string | string[]);
    case 'difficulty': return compareStringMulti(score.difficulty_name, value as string | string[]);
    case 'title': return compareStringMulti(score.musicdb?.name ?? '', value as string);
    case 'version':
    case 'era':
      return true; // Placeholder
    default:
      return true;
  }
}

export function useFilterResults(
  scores: ScoreData[],
  rules: FilterRule[],
  matchMode: 'all' | 'any'
): { count: number; filteredScores: ScoreData[] } {
  return useMemo(() => {
    if (rules.length === 0) {
      return { count: scores.length, filteredScores: scores };
    }

    const filteredScores = scores.filter((score) => {
      if (matchMode === 'all') {
        return rules.every((rule) => matchesRule(score, rule));
      } else {
        return rules.some((rule) => matchesRule(score, rule));
      }
    });

    return { count: filteredScores.length, filteredScores };
  }, [scores, rules, matchMode]);
}
