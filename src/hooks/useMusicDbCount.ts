import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FilterRule } from '@/components/filters/filterTypes';

interface MusicDbChart {
  id: number;
  difficulty_level: number | null;
  difficulty_name: string | null;
  name: string | null;
}

/**
 * Matches a chart from musicdb against a filter rule.
 * Note: musicdb charts don't have score/flare/lamp/grade - those are user score data.
 * Only level, difficulty, and title can be matched against the catalog.
 */
function chartMatchesRule(chart: MusicDbChart, rule: FilterRule): boolean {
  const { type, operator, value } = rule;

  // Skip empty values
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;

  // Handle numeric multi-select (level)
  const compareNumericMulti = (actual: number | null, target: number | number[] | [number, number]): boolean => {
    if (actual === null) return false;
    
    // Range comparison for "is_between"
    if (operator === 'is_between' && Array.isArray(target) && target.length === 2) {
      const [min, max] = target as [number, number];
      return actual >= Math.min(min, max) && actual <= Math.max(min, max);
    }
    
    // Multi-select array
    if (Array.isArray(target)) {
      if (target.length === 0) return true;
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

  // Handle string multi-select (difficulty)
  const compareStringMulti = (actual: string | null, target: string | string[]): boolean => {
    if (actual === null) return false;
    const normalizedActual = actual.toLowerCase();
    
    if (Array.isArray(target)) {
      if (target.length === 0) return true;
      const matches = target.some(t => normalizedActual === t.toLowerCase());
      return operator === 'is' ? matches : !matches;
    }
    
    if (target === '') return true;
    const normalizedTarget = target.toLowerCase();
    switch (operator) {
      case 'is': return normalizedActual === normalizedTarget;
      case 'is_not': return normalizedActual !== normalizedTarget;
      case 'contains': return normalizedActual.includes(normalizedTarget);
      default: return false;
    }
  };

  switch (type) {
    case 'level': 
      return compareNumericMulti(chart.difficulty_level, value as number | number[] | [number, number]);
    case 'difficulty': 
      return compareStringMulti(chart.difficulty_name, value as string | string[]);
    case 'title': 
      return compareStringMulti(chart.name, value as string);
    // Score, flare, lamp, grade are user-score properties, not catalog properties
    // For goal counting, we count all charts in catalog that match level/difficulty criteria
    case 'score':
    case 'flare':
    case 'lamp':
    case 'grade':
      return true; // These don't filter the catalog, only user scores
    case 'version':
    case 'era':
      return true; // Placeholder for future implementation
    default:
      return true;
  }
}

/**
 * Fetches the count of charts in musicdb that match the given criteria rules.
 * Used for goal total calculations.
 */
export function useMusicDbCount(
  rules: FilterRule[],
  matchMode: 'all' | 'any' = 'all',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['musicdb-count', rules, matchMode],
    queryFn: async () => {
      // Fetch ALL charts from musicdb - use explicit limit to bypass default 1000 row cap
      const { data, error } = await supabase
        .from('musicdb')
        .select('id, difficulty_level, difficulty_name, name')
        .not('difficulty_level', 'is', null)
        .limit(50000); // Explicit limit - catalog has ~10k charts

      if (error) throw error;

      const charts = (data || []) as MusicDbChart[];
      
      // If no rules, count all charts
      if (rules.length === 0) {
        return { total: charts.length, charts };
      }

      // Filter charts by criteria rules
      const matchingCharts = charts.filter((chart) => {
        if (matchMode === 'all') {
          return rules.every((rule) => chartMatchesRule(chart, rule));
        } else {
          return rules.some((rule) => chartMatchesRule(chart, rule));
        }
      });

      return { total: matchingCharts.length, charts: matchingCharts };
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
  // Fetch ALL charts - use explicit limit to bypass default 1000 row cap
  const { data, error } = await supabase
    .from('musicdb')
    .select('id, difficulty_level, difficulty_name, name')
    .not('difficulty_level', 'is', null)
    .limit(50000); // Explicit limit - catalog has ~10k charts

  if (error) throw error;

  const charts = (data || []) as MusicDbChart[];
  
  if (rules.length === 0) {
    return charts.length;
  }

  const matchingCharts = charts.filter((chart) => {
    if (matchMode === 'all') {
      return rules.every((rule) => chartMatchesRule(chart, rule));
    } else {
      return rules.some((rule) => chartMatchesRule(chart, rule));
    }
  });

  return matchingCharts.length;
}
