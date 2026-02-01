import { useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { useSessionCharacter } from '@/hooks/useSessionCharacter';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useGoals } from '@/hooks/useGoals';
import { useServerGoalProgress } from '@/hooks/useServerGoalProgress';
import { use12MSMode } from '@/hooks/use12MSMode';
import { UserAvatar } from '@/components/home/UserAvatar';
import { SearchBar } from '@/components/home/SearchBar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalCard } from '@/components/home/GoalCard';
import { GoalsEmptyState } from '@/components/home/GoalsEmptyState';
import { CreateGoalSheet } from '@/components/goals/CreateGoalSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import rainbowBg from '@/assets/rainbow-bg.png';
import type { FilterRule } from '@/components/filters/filterTypes';

interface Goal {
  id: string;
  name: string;
  target_type: string;
  target_value: string;
  criteria_rules: unknown[];
  criteria_match_mode: string;
  goal_mode: string;
  goal_count?: number | null;
  score_mode?: string;
  score_floor?: number | null;
}

// Component to render a goal card with server-calculated progress
function GoalCardWithProgress({ goal }: { goal: Goal }) {
  // Use server-side RPC for progress calculation
  // This replaces both useMusicDbCount and useGoalProgress with a single query
  const { data: progress, isLoading } = useServerGoalProgress(
    goal.id,
    goal.criteria_rules as FilterRule[],
    goal.target_type as 'lamp' | 'grade' | 'flare' | 'score',
    goal.target_value,
    true
  );

  // For "count" mode, use goal_count as the denominator
  // For "all" mode, use server-calculated total
  const isAverageMode = goal.target_type === 'score' && goal.score_mode === 'average';
  
  const total = isAverageMode
    ? parseInt(goal.target_value, 10) // For average mode, total is the target average
    : goal.goal_mode === 'count' 
      ? (goal.goal_count ?? 0) 
      : (progress?.total ?? 0);

  const current = isAverageMode
    ? 0 // Average mode needs special handling - not supported by RPC yet
    : (progress?.completed ?? 0);

  return (
    <GoalCard
      id={goal.id}
      title={goal.name}
      targetType={goal.target_type as 'lamp' | 'grade' | 'flare' | 'score'}
      targetValue={goal.target_value}
      current={current}
      total={total}
      scoreMode={goal.score_mode as 'target' | 'average' | undefined}
      scoreFloor={goal.score_floor}
    />
  );
}

export default function Home() {
  const { username, loading: usernameLoading } = useUsername();
  const characterImage = useSessionCharacter();
  const { isVisible } = useScrollDirection({ threshold: 15 });
  const { goals, isLoading: goalsLoading } = useGoals();
  const [createGoalOpen, setCreateGoalOpen] = useState(false);

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
            <GoalsEmptyState onCreateGoal={() => setCreateGoalOpen(true)} />
          ) : (
            goals.map((goal) => (
              <GoalCardWithProgress
                key={goal.id}
                goal={goal}
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
