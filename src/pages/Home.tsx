import { useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useGoals } from '@/hooks/useGoals';
import { useGoalProgress, type ScoreWithSong } from '@/hooks/useGoalProgress';
import { useMusicDbCount } from '@/hooks/useMusicDbCount';
import { use12MSMode } from '@/hooks/use12MSMode';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/home/UserAvatar';
import { SearchBar } from '@/components/home/SearchBar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalCard } from '@/components/home/GoalCard';
import { CreateGoalSheet } from '@/components/goals/CreateGoalSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import rainbowBg from '@/assets/rainbow-bg.png';
import type { Goal } from '@/hooks/useGoalProgress';
import type { FilterRule } from '@/components/filters/filterTypes';

// Component to render a goal card with real progress
function GoalCardWithProgress({ 
  goal, 
  scores, 
  isLoadingScores,
  reverseTransformHalo
}: { 
  goal: Goal; 
  scores: ScoreWithSong[];
  isLoadingScores: boolean;
  reverseTransformHalo: (target: string | null) => string | null;
}) {
  // Get total from musicdb based on goal criteria
  const { data: musicDbData } = useMusicDbCount(
    goal.criteria_rules as FilterRule[],
    goal.criteria_match_mode,
    true
  );
  const musicDbTotal = musicDbData?.total ?? 0;

  const progress = useGoalProgress(goal, scores, [], isLoadingScores, reverseTransformHalo);

  // Map target type to goal card type
  const getGoalCardType = () => {
    if (goal.target_type === 'lamp') {
      const value = goal.target_value.toLowerCase();
      if (value === 'pfc') return 'pfc' as const;
      if (value === 'mfc') return 'mfc' as const;
      if (value === 'gfc') return 'gfc' as const;
    }
    return 'pfc' as const;
  };

  // Use musicdb total for the denominator
  const total = musicDbTotal > 0 ? musicDbTotal : progress.total;

  return (
    <GoalCard
      id={goal.id}
      title={goal.name}
      type={getGoalCardType()}
      current={progress.current}
      total={total}
    />
  );
}

export default function Home() {
  const { username, loading: usernameLoading } = useUsername();
  const characterImage = useSessionCharacter();
  const { isVisible } = useScrollDirection({ threshold: 15 });
  const { user } = useAuth();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { reverseTransformHalo } = use12MSMode();
  const [createGoalOpen, setCreateGoalOpen] = useState(false);

  // Fetch user scores for progress calculation
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

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search:', query);
  };

  return (
    <div className="relative min-h-screen">
      {/* Rainbow background - fixed */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${rainbowBg})` }}
      />
      
      {/* Character image - fixed, positioned top-right */}
      <img
        src={characterImage}
        alt="Character"
        className="fixed top-0 right-0 w-[240px] h-auto object-contain pointer-events-none z-[5]"
      />
      
      {/* Fixed fade overlay at bottom - reveals rainbow background, syncs with nav */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-[200px] pointer-events-none z-[15]",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-[120px]"
        )}
        style={{ 
          backgroundImage: `url(${rainbowBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 100%)'
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col min-h-screen px-[28px]">
        {/* Header section */}
        <header className="pt-[75px] pb-4">
          {/* Avatar and greeting */}
          <div className="flex items-start gap-2 mb-4">
            <UserAvatar size={40} className="mt-1" linkToProfile />
          </div>
          
          {/* Two-line greeting */}
          <div className="mb-6">
            <span className="text-foreground text-2xl">Hi </span>
            <span className="text-white text-2xl font-bold text-shadow-greeting">
              {usernameLoading ? '...' : username}
            </span>
          </div>

          {/* Search bar */}
          <SearchBar onSearch={handleSearch} />
        </header>

        {/* Goals section */}
        <section className="flex flex-col gap-[3px] mt-[3px]">
          {goalsLoading ? (
            <>
              <Skeleton className="h-32 w-full rounded-[10px]" />
              <Skeleton className="h-32 w-full rounded-[10px]" />
            </>
          ) : goals.length === 0 ? (
            <div className="card-base w-full text-center py-8">
              <p className="text-foreground text-lg font-medium">No goals yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create your first goal to start tracking progress!
              </p>
              <Button onClick={() => setCreateGoalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </div>
          ) : (
            goals.map((goal) => (
              <GoalCardWithProgress
                key={goal.id}
                goal={goal}
                scores={scores}
                isLoadingScores={scoresLoading}
                reverseTransformHalo={reverseTransformHalo}
              />
            ))
          )}
        </section>
      </div>

      {/* Floating Create Button */}
      <Button
        onClick={() => setCreateGoalOpen(true)}
        size="icon"
        className="fixed bottom-[120px] right-[28px] z-20 h-14 w-14 rounded-full shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Create Goal Sheet */}
      <CreateGoalSheet open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
    </div>
  );
}
