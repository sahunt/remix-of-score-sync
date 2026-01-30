import { useState } from 'react';
import { CompletedSongsList } from './CompletedSongsList';
import { RemainingSongsList } from './RemainingSongsList';
import type { Goal, ScoreWithSong } from '@/hooks/useGoalProgress';
import { cn } from '@/lib/utils';

interface GoalSongTabsProps {
  goal: Goal;
  completedSongs: ScoreWithSong[];
  remainingSongs: ScoreWithSong[];
  isLoading: boolean;
}

export function GoalSongTabs({
  goal,
  completedSongs,
  remainingSongs,
  isLoading,
}: GoalSongTabsProps) {
  const firstTabLabel = 'Remaining';
  const firstTabCount = remainingSongs.length;
  
  // Default to "remaining" (first tab)
  const [activeTab, setActiveTab] = useState<'remaining' | 'completed'>('remaining');

  return (
    <div className="w-full space-y-4">
      {/* Toggle matching MatchModeToggle design */}
      <div className="relative flex items-center rounded-[10px] bg-[#262937] p-1.5">
        {/* Sliding background indicator */}
        <div
          className={cn(
            'absolute top-1.5 bottom-1.5 rounded-[8px] bg-primary transition-all duration-300 ease-out',
            activeTab === 'remaining' 
              ? 'left-1.5 right-[calc(50%+1.5px)]' 
              : 'left-[calc(50%+1.5px)] right-1.5'
          )}
        />
        
        <button
          onClick={() => setActiveTab('remaining')}
          className={cn(
            'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
            activeTab === 'remaining'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          {firstTabLabel} ({firstTabCount})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            'relative z-10 flex-1 rounded-[8px] h-10 px-4 text-sm font-medium transition-all duration-300 ease-out',
            activeTab === 'completed'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
          )}
        >
          Completed ({completedSongs.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'remaining' ? (
        <RemainingSongsList 
          songs={remainingSongs} 
          goal={goal}
          isLoading={isLoading} 
        />
      ) : (
        <CompletedSongsList songs={completedSongs} isLoading={isLoading} />
      )}
    </div>
  );
}
