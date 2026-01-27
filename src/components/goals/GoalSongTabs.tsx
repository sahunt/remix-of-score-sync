import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompletedSongsList } from './CompletedSongsList';
import { RemainingSongsList } from './RemainingSongsList';
import { SuggestionsList } from './SuggestionsList';
import type { Goal, ScoreWithSong } from '@/hooks/useGoalProgress';

interface GoalSongTabsProps {
  goal: Goal;
  completedSongs: ScoreWithSong[];
  remainingSongs: ScoreWithSong[];
  suggestedSongs: ScoreWithSong[];
  isLoading: boolean;
}

export function GoalSongTabs({
  goal,
  completedSongs,
  remainingSongs,
  suggestedSongs,
  isLoading,
}: GoalSongTabsProps) {
  const isCountMode = goal.goal_mode === 'count';
  const secondTabLabel = isCountMode ? 'Suggestions' : 'Remaining';
  const secondTabCount = isCountMode ? suggestedSongs.length : remainingSongs.length;

  return (
    <Tabs defaultValue="completed" className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-12 bg-muted/50 rounded-[10px] p-1">
        <TabsTrigger 
          value="completed" 
          className="rounded-[8px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Completed ({completedSongs.length})
        </TabsTrigger>
        <TabsTrigger 
          value="remaining" 
          className="rounded-[8px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          {secondTabLabel} ({secondTabCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="completed" className="mt-4">
        <CompletedSongsList songs={completedSongs} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="remaining" className="mt-4">
        {isCountMode ? (
          <SuggestionsList 
            songs={suggestedSongs} 
            goal={goal}
            isLoading={isLoading} 
          />
        ) : (
          <RemainingSongsList 
            songs={remainingSongs} 
            goal={goal}
            isLoading={isLoading} 
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
