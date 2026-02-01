import { useMemo } from 'react';
import type { FilterRule } from '@/components/filters/filterTypes';
import { filterScoresByRules } from '@/lib/filterMatcher';
import type { ScoreWithSong, ChartInfo } from '@/types/scores';

// Re-export types for consumers
export type { ScoreWithSong, ChartInfo };

export interface GoalProgressResult {
  current: number;
  total: number;
  completedSongs: ScoreWithSong[];
  remainingSongs: ScoreWithSong[];
  suggestedSongs: ScoreWithSong[];
  isLoading: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target_type: 'lamp' | 'grade' | 'flare' | 'score';
  target_value: string;
  criteria_rules: any[];
  criteria_match_mode: 'all' | 'any';
  goal_mode: 'all' | 'count';
  goal_count?: number | null;
  score_mode?: 'target' | 'average';
  score_floor?: number | null;
}

// Lamp hierarchy for proximity calculation (best to worst)
const LAMP_ORDER = ['mfc', 'pfc', 'gfc', 'fc', 'life4', 'clear', 'fail', null] as const;

// Grade hierarchy for proximity calculation (best to worst)
const GRADE_ORDER = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'] as const;

// Check if a score meets the target
// reverseTransformHalo is used for 12MS mode: transforms the visual target back to the DB value
export function meetsTarget(
  score: ScoreWithSong,
  targetType: 'lamp' | 'grade' | 'flare' | 'score',
  targetValue: string,
  reverseTransformHalo?: (target: string | null) => string | null
): boolean {
  if (score.isUnplayed) return false;

  switch (targetType) {
    case 'lamp': {
      if (!score.halo) return false;
      // Apply reverse transformation if provided (for 12MS mode)
      const effectiveTarget = reverseTransformHalo ? reverseTransformHalo(targetValue) : targetValue;
      const currentIndex = LAMP_ORDER.indexOf(score.halo.toLowerCase() as any);
      const targetIndex = LAMP_ORDER.indexOf((effectiveTarget || targetValue).toLowerCase() as any);
      return currentIndex !== -1 && targetIndex !== -1 && currentIndex <= targetIndex;
    }
    case 'grade': {
      if (!score.rank) return false;
      const currentIndex = GRADE_ORDER.indexOf(score.rank.toUpperCase() as any);
      const targetIndex = GRADE_ORDER.indexOf(targetValue.toUpperCase() as any);
      return currentIndex !== -1 && targetIndex !== -1 && currentIndex <= targetIndex;
    }
    case 'flare': {
      if (score.flare === null || score.flare === undefined) return false;
      const targetFlare = targetValue.toLowerCase() === 'ex' ? 10 : parseInt(targetValue, 10);
      return score.flare >= targetFlare;
    }
    case 'score': {
      if (score.score === null) return false;
      const targetScore = parseInt(targetValue, 10);
      return score.score >= targetScore;
    }
    default:
      return false;
  }
}

// Calculate proximity score (0-100, higher = closer to goal)
export function calculateProximityScore(
  score: ScoreWithSong,
  targetType: 'lamp' | 'grade' | 'flare' | 'score',
  targetValue: string
): number {
  if (score.isUnplayed) return 0;

  switch (targetType) {
    case 'lamp': {
      if (!score.halo) return 5; // Uncleared but played
      const currentIndex = LAMP_ORDER.indexOf(score.halo.toLowerCase() as any);
      const targetIndex = LAMP_ORDER.indexOf(targetValue.toLowerCase() as any);
      if (currentIndex === -1 || targetIndex === -1) return 0;
      if (currentIndex <= targetIndex) return 100; // Already achieved
      // Calculate percentage based on steps away
      const stepsAway = currentIndex - targetIndex;
      const maxSteps = LAMP_ORDER.length - 1;
      return Math.max(0, 100 - (stepsAway / maxSteps) * 100);
    }
    case 'grade': {
      if (!score.rank) return 5;
      const currentIndex = GRADE_ORDER.indexOf(score.rank.toUpperCase() as any);
      const targetIndex = GRADE_ORDER.indexOf(targetValue.toUpperCase() as any);
      if (currentIndex === -1 || targetIndex === -1) return 0;
      if (currentIndex <= targetIndex) return 100;
      const stepsAway = currentIndex - targetIndex;
      const maxSteps = GRADE_ORDER.length - 1;
      return Math.max(0, 100 - (stepsAway / maxSteps) * 100);
    }
    case 'flare': {
      if (score.flare === null || score.flare === undefined) return 5;
      const targetFlare = targetValue.toLowerCase() === 'ex' ? 10 : parseInt(targetValue, 10);
      if (score.flare >= targetFlare) return 100;
      // Percentage of target achieved
      return (score.flare / targetFlare) * 100;
    }
    case 'score': {
      if (score.score === null) return 5;
      const targetScore = parseInt(targetValue, 10);
      if (score.score >= targetScore) return 100;
      return (score.score / targetScore) * 100;
    }
    default:
      return 0;
  }
}

// Get proximity label for UI display
export function getProximityLabel(
  score: ScoreWithSong,
  targetType: 'lamp' | 'grade' | 'flare' | 'score',
  targetValue: string
): string | null {
  if (score.isUnplayed) return 'Not yet played';

  switch (targetType) {
    case 'lamp': {
      if (!score.halo) return 'Needs clear';
      const currentIndex = LAMP_ORDER.indexOf(score.halo.toLowerCase() as any);
      const targetIndex = LAMP_ORDER.indexOf(targetValue.toLowerCase() as any);
      if (currentIndex === -1 || targetIndex === -1) return null;
      const stepsAway = currentIndex - targetIndex;
      if (stepsAway === 0) return null; // Already achieved
      if (stepsAway === 1) return `1 step from ${targetValue.toUpperCase()}`;
      return `${stepsAway} steps from ${targetValue.toUpperCase()}`;
    }
    case 'grade': {
      if (!score.rank) return 'Needs grade';
      const currentIndex = GRADE_ORDER.indexOf(score.rank.toUpperCase() as any);
      const targetIndex = GRADE_ORDER.indexOf(targetValue.toUpperCase() as any);
      if (currentIndex === -1 || targetIndex === -1) return null;
      const stepsAway = currentIndex - targetIndex;
      if (stepsAway === 0) return null;
      if (stepsAway === 1) return `1 grade from ${targetValue}`;
      return `${stepsAway} grades from ${targetValue}`;
    }
    case 'flare': {
      if (score.flare === null) return 'Needs flare';
      const targetFlare = targetValue.toLowerCase() === 'ex' ? 10 : parseInt(targetValue, 10);
      const diff = targetFlare - score.flare;
      if (diff <= 0) return null;
      if (diff === 1) return '1 flare level away';
      return `${diff} flare levels away`;
    }
    case 'score': {
      if (score.score === null) return 'Needs score';
      const targetScore = parseInt(targetValue, 10);
      const diff = targetScore - score.score;
      if (diff <= 0) return null;
      return `${diff.toLocaleString()} points away`;
    }
    default:
      return null;
  }
}

// Calculate average score from played songs (rounded to nearest 10)
function calculateAverageScore(scores: ScoreWithSong[]): number {
  const playedWithScores = scores.filter(s => s.score !== null && !s.isUnplayed);
  if (playedWithScores.length === 0) return 0;
  const sum = playedWithScores.reduce((acc, s) => acc + (s.score ?? 0), 0);
  return Math.round(sum / playedWithScores.length / 10) * 10;
}

// Hook to calculate goal progress from scores
// reverseTransformHalo is used for 12MS mode goal matching
export function useGoalProgress(
  goal: Goal | null,
  scores: ScoreWithSong[],
  allCharts: ChartInfo[] = [],
  isLoading: boolean = false,
  reverseTransformHalo?: (target: string | null) => string | null
): GoalProgressResult {
  return useMemo(() => {
    if (!goal || isLoading) {
      return {
        current: 0,
        total: 0,
        completedSongs: [],
        remainingSongs: [],
        suggestedSongs: [],
        isLoading,
      };
    }

    // Apply criteria_rules filtering using centralized filter matcher
    const matchingScores = filterScoresByRules(
      scores, 
      goal.criteria_rules as FilterRule[], 
      goal.criteria_match_mode
    );

    // Handle average score mode differently
    if (goal.target_type === 'score' && goal.score_mode === 'average') {
      const currentAvg = calculateAverageScore(matchingScores);
      const targetAvg = parseInt(goal.target_value, 10);
      
      // For average mode, all played songs contribute - sort by score descending
      const allSongsSorted = [...matchingScores].sort((a, b) => {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        return scoreB - scoreA;
      });
      
      // Completed = songs that are above average target, Remaining = below
      const completedSongs = allSongsSorted.filter(s => s.score !== null && s.score >= targetAvg);
      const remainingSongs = allSongsSorted.filter(s => s.score === null || s.score < targetAvg);

      return {
        current: currentAvg,
        total: targetAvg,
        completedSongs,
        remainingSongs,
        suggestedSongs: [],
        isLoading,
      };
    }

    // Split into completed vs not completed (target mode)
    const completedSongs = matchingScores.filter(s => 
      meetsTarget(s, goal.target_type, goal.target_value, reverseTransformHalo)
    );

    const incompleteSongs = matchingScores.filter(s => 
      !meetsTarget(s, goal.target_type, goal.target_value, reverseTransformHalo)
    );

    // Sort incomplete songs by their actual value (highest first)
    const sortedIncomplete = [...incompleteSongs].sort((a, b) => {
      switch (goal.target_type) {
        case 'score': {
          const scoreA = a.score ?? -1;
          const scoreB = b.score ?? -1;
          return scoreB - scoreA;
        }
        case 'flare': {
          const flareA = a.flare ?? -1;
          const flareB = b.flare ?? -1;
          return flareB - flareA;
        }
        case 'lamp': {
          const indexA = a.halo ? LAMP_ORDER.indexOf(a.halo.toLowerCase() as any) : LAMP_ORDER.length;
          const indexB = b.halo ? LAMP_ORDER.indexOf(b.halo.toLowerCase() as any) : LAMP_ORDER.length;
          return indexA - indexB;
        }
        case 'grade': {
          const indexA = a.rank ? GRADE_ORDER.indexOf(a.rank.toUpperCase() as any) : GRADE_ORDER.length;
          const indexB = b.rank ? GRADE_ORDER.indexOf(b.rank.toUpperCase() as any) : GRADE_ORDER.length;
          return indexA - indexB;
        }
        default:
          return 0;
      }
    });

    // Both modes now show remaining songs sorted by value
    const remainingSongs = sortedIncomplete;
    const suggestedSongs: ScoreWithSong[] = [];

    // Calculate totals
    const total = goal.goal_mode === 'all' 
      ? matchingScores.length 
      : (goal.goal_count ?? 0);
    
    const current = goal.goal_mode === 'all'
      ? completedSongs.length
      : Math.min(completedSongs.length, goal.goal_count ?? 0);

    return {
      current,
      total,
      completedSongs,
      remainingSongs,
      suggestedSongs,
      isLoading,
    };
  }, [goal, scores, allCharts, isLoading, reverseTransformHalo]);
}
