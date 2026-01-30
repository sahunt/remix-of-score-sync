import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useGoals } from '@/hooks/useGoals';
import { useGoalProgress } from '@/hooks/useGoalProgress';
import { useMusicDbCount } from '@/hooks/useMusicDbCount';
import { useUserScores } from '@/hooks/useUserScores';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GoalDetailHeader } from '@/components/goals/GoalDetailHeader';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalSongTabs } from '@/components/goals/GoalSongTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { FilterRule } from '@/components/filters/filterTypes';
import type { ScoreWithSong } from '@/hooks/useGoalProgress';

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { deleteGoal } = useGoals();
  const { reverseTransformHalo } = use12MSMode();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch the goal
  const { data: goal, isLoading: goalLoading } = useGoal(goalId);

  // Extract criteria for queries
  const criteriaRules = (goal?.criteria_rules as FilterRule[]) ?? [];

  // Get total from musicdb based on goal criteria
  const { data: musicDbData } = useMusicDbCount(
    criteriaRules,
    goal?.criteria_match_mode ?? 'all',
    !!goal
  );
  const musicDbTotal = musicDbData?.total ?? 0;

  // Use shared hook for consistent score data - pass filter rules for DB-level optimization
  const { data: scores = [], isLoading: scoresLoading } = useUserScores({
    filterRules: criteriaRules,
    enabled: !!goal,
    queryKeySuffix: `goal-${goal?.id}`,
  });

  // Fetch all matching charts from musicdb to identify unplayed ones
  const levelRule = criteriaRules.find(r => r.type === 'level');
  const difficultyRule = criteriaRules.find(r => r.type === 'difficulty');

  const { data: allMatchingCharts = [] } = useQuery({
    queryKey: ['musicdb-charts-for-goal', goal?.id],
    queryFn: async () => {
      let query = supabase
        .from('musicdb')
        .select('id, name, artist, eamuse_id, song_id, difficulty_level, difficulty_name, playstyle')
        .eq('playstyle', 'SP')
        .eq('deleted', false)
        .not('difficulty_level', 'is', null);
      
      // Apply level filter
      if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
        if (levelRule.operator === 'is') {
          query = query.in('difficulty_level', levelRule.value as number[]);
        }
      }
      
      // Apply difficulty filter
      if (difficultyRule && Array.isArray(difficultyRule.value) && difficultyRule.value.length > 0) {
        const diffs = (difficultyRule.value as string[]).map(d => d.toUpperCase());
        if (difficultyRule.operator === 'is') {
          query = query.in('difficulty_name', diffs);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!goal,
  });

  // Create set of played chart IDs (musicdb.id) for quick lookup
  const playedChartIds = new Set(
    scores.map(s => s.musicdb_id).filter(Boolean)
  );

  // Identify unplayed charts and convert to ScoreWithSong format
  const unplayedCharts: ScoreWithSong[] = allMatchingCharts
    .filter(chart => !playedChartIds.has(chart.id))
    .map(chart => ({
      id: `unplayed-${chart.id}`,
      score: null,
      rank: null,
      flare: null,
      halo: null,
      difficulty_level: chart.difficulty_level,
      difficulty_name: chart.difficulty_name,
      playstyle: chart.playstyle,
      name: chart.name,
      artist: chart.artist,
      eamuse_id: chart.eamuse_id,
      song_id: chart.song_id,
      isUnplayed: true,
    }));

  // Calculate progress with 12MS mode transformation
  const progress = useGoalProgress(goal ?? null, scores, [], scoresLoading, reverseTransformHalo);

  // Combine remaining songs with unplayed charts for the tabs
  const allRemainingSongs = [...progress.remainingSongs, ...unplayedCharts];

  const handleBack = () => {
    navigate('/home');
  };

  const handleDelete = async () => {
    if (!goalId) return;
    
    setIsDeleting(true);
    try {
      await deleteGoal.mutateAsync(goalId);
      toast({
        title: 'Goal deleted',
        description: 'Your goal has been removed.',
      });
      navigate('/home');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (goalLoading) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="px-[28px] pt-[60px]">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-32 w-full rounded-[10px]" />
            <Skeleton className="h-10 w-full rounded-[10px]" />
            <Skeleton className="h-64 w-full rounded-[10px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="px-[28px] pt-[60px]">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">Goal not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-[28px] pt-[60px] pb-8">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
        
        {/* Goal Card */}
        <div className="mt-4">
          <GoalCard
            title={goal.name}
            targetType={goal.target_type as 'lamp' | 'grade' | 'flare' | 'score'}
            targetValue={goal.target_value}
            current={progress.current}
            total={musicDbTotal > 0 ? musicDbTotal : progress.total}
          />
        </div>

        {/* Tabs with song lists */}
        <div className="mt-6">
          <GoalSongTabs
            goal={goal}
            completedSongs={progress.completedSongs}
            remainingSongs={allRemainingSongs}
            isLoading={scoresLoading}
          />
        </div>
      </div>
    </div>
  );
}
