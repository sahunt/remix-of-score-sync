import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoal, useGoals } from '@/hooks/useGoals';
import { useGoalProgress, type ScoreWithSong } from '@/hooks/useGoalProgress';
import { useMusicDbCount } from '@/hooks/useMusicDbCount';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GoalDetailHeader } from '@/components/goals/GoalDetailHeader';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalSongTabs } from '@/components/goals/GoalSongTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { FilterRule } from '@/components/filters/filterTypes';

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteGoal } = useGoals();
  const { reverseTransformHalo } = use12MSMode();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch the goal
  const { data: goal, isLoading: goalLoading } = useGoal(goalId);

  // Get total from musicdb based on goal criteria
  const { data: musicDbData } = useMusicDbCount(
    (goal?.criteria_rules as FilterRule[]) ?? [],
    goal?.criteria_match_mode ?? 'all',
    !!goal
  );
  const musicDbTotal = musicDbData?.total ?? 0;

  // Fetch user scores
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['user-scores', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_scores')
        .select(`
          id,
          score,
          timestamp,
          playstyle,
          difficulty_name,
          difficulty_level,
          rank,
          flare,
          halo,
          musicdb(name, artist)
        `)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as ScoreWithSong[];
    },
    enabled: !!user?.id,
  });

  // Calculate progress with 12MS mode transformation
  const progress = useGoalProgress(goal ?? null, scores, [], scoresLoading, reverseTransformHalo);

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

  // Map target type to goal card type
  const getGoalCardType = () => {
    if (goal.target_type === 'lamp') {
      const value = goal.target_value.toLowerCase();
      if (value === 'pfc') return 'pfc';
      if (value === 'mfc') return 'mfc';
      if (value === 'gfc') return 'gfc';
    }
    return 'pfc'; // Default fallback
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-[28px] pt-[60px] pb-8">
          <GoalDetailHeader onBack={handleBack} onDelete={handleDelete} isDeleting={isDeleting} />
        
        {/* Goal Card */}
        <div className="mt-4">
          <GoalCard
            title={goal.name}
            type={getGoalCardType()}
            current={progress.current}
            total={musicDbTotal > 0 ? musicDbTotal : progress.total}
          />
        </div>

        {/* Tabs with song lists */}
        <div className="mt-6">
          <GoalSongTabs
            goal={goal}
            completedSongs={progress.completedSongs}
            remainingSongs={progress.remainingSongs}
            suggestedSongs={progress.suggestedSongs}
            isLoading={scoresLoading}
          />
        </div>
      </div>
    </div>
  );
}
