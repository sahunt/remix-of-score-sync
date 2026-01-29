import { useMemo } from 'react';

// Types for goal progress calculation
export interface ScoreWithSong {
  id: string;
  score: number | null;
  rank: string | null;
  flare: number | null;
  halo: string | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  playstyle: string | null;
  musicdb?: {
    name: string | null;
    artist: string | null;
    eamuse_id?: string | null;
    song_id?: number | null;
  } | null;
  // For unplayed charts from musicdb
  name?: string | null;
  artist?: string | null;
  eamuse_id?: string | null;
  song_id?: number | null;
  isUnplayed?: boolean;
}

export interface ChartInfo {
  id: number;
  name: string | null;
  artist: string | null;
  difficulty_level: number | null;
  difficulty_name: string | null;
  playstyle: string | null;
}

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

    // TODO: Apply criteria_rules filtering when implemented
    // For now, use all scores
    const matchingScores = scores;

    // Split into completed vs not completed
    const completedSongs = matchingScores.filter(s => 
      meetsTarget(s, goal.target_type, goal.target_value, reverseTransformHalo)
    );

    const incompleteSongs = matchingScores.filter(s => 
      !meetsTarget(s, goal.target_type, goal.target_value, reverseTransformHalo)
    );

    // Sort incomplete by proximity (closest to goal first)
    const sortedIncomplete = [...incompleteSongs].sort((a, b) => {
      const proximityA = calculateProximityScore(a, goal.target_type, goal.target_value);
      const proximityB = calculateProximityScore(b, goal.target_type, goal.target_value);
      return proximityB - proximityA; // Higher proximity = closer to goal = first
    });

    // For "all" mode, remaining is what's left to complete
    // For "count" mode, suggestions are the best candidates to work on
    const remainingSongs = goal.goal_mode === 'all' ? sortedIncomplete : [];
    const suggestedSongs = goal.goal_mode === 'count' ? sortedIncomplete.slice(0, 20) : [];

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
