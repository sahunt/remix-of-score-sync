import { SongCard } from '@/components/scores/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getProximityLabel, type Goal, type ScoreWithSong } from '@/hooks/useGoalProgress';

interface SuggestionsListProps {
  songs: ScoreWithSong[];
  goal: Goal;
  isLoading: boolean;
}

export function SuggestionsList({ songs, goal, isLoading }: SuggestionsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No suggestions available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload more scores to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide px-1 mb-3">
        Songs closest to achieving this goal
      </p>
      {songs.map((song) => {
        const proximityLabel = getProximityLabel(song, goal.target_type, goal.target_value);
        
        return (
          <div key={song.id} className="relative">
            <SongCard
              name={song.musicdb?.name ?? song.name ?? 'Unknown Song'}
              difficultyLevel={song.difficulty_level}
              difficultyName={song.difficulty_name}
              score={song.score}
              rank={song.rank}
              flare={song.flare}
              halo={song.halo}
              eamuseId={song.musicdb?.eamuse_id ?? song.eamuse_id}
              songId={song.musicdb?.song_id ?? song.song_id}
            />
            {proximityLabel && (
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-[10px] text-muted-foreground">
                  {proximityLabel}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
