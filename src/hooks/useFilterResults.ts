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

  const compare = (actual: number | null, target: number | [number, number]): boolean => {
    if (actual === null) return false;
    
    if (Array.isArray(target)) {
      const [min, max] = target;
      switch (operator) {
        case 'is_between':
          return actual >= Math.min(min, max) && actual <= Math.max(min, max);
        default:
          return false;
      }
    }
    
    switch (operator) {
      case 'is':
        return actual === target;
      case 'is_not':
        return actual !== target;
      case 'less_than':
        return actual < target;
      case 'greater_than':
        return actual > target;
      default:
        return false;
    }
  };

  const compareString = (actual: string | null, target: string): boolean => {
    if (actual === null) return false;
    const normalizedActual = actual.toLowerCase();
    const normalizedTarget = target.toLowerCase();
    
    switch (operator) {
      case 'is':
        return normalizedActual === normalizedTarget;
      case 'is_not':
        return normalizedActual !== normalizedTarget;
      case 'contains':
        return normalizedActual.includes(normalizedTarget);
      default:
        return false;
    }
  };

  switch (type) {
    case 'score':
      return compare(score.score, value as number | [number, number]);
    
    case 'level':
      return compare(score.difficulty_level, value as number | [number, number]);
    
    case 'flare':
      return compare(score.flare, value as number | [number, number]);
    
    case 'grade':
      return compareString(score.rank, value as string);
    
    case 'lamp':
      return compareString(score.halo, value as string);
    
    case 'difficulty':
      return compareString(score.difficulty_name, value as string);
    
    case 'title': {
      const songName = score.musicdb?.name ?? '';
      return compareString(songName, value as string);
    }
    
    // Version and Era would need additional data fields
    case 'version':
    case 'era':
      return true; // Placeholder - would need version/era data in scores
    
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
