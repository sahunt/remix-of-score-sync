import { SongCard } from '@/components/scores/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import { type Goal, type ScoreWithSong } from '@/hooks/useGoalProgress';
import { cn } from '@/lib/utils';

interface RemainingSongsListProps {
  songs: ScoreWithSong[];
  goal: Goal;
  isLoading: boolean;
}

export function RemainingSongsList({ songs, goal, isLoading }: RemainingSongsListProps) {
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
        <div className="text-4xl mb-4">🎉</div>
        <p className="text-foreground font-medium">Goal Complete!</p>
        <p className="text-sm text-muted-foreground mt-1">
          You've achieved this goal on all matching songs.
        </p>
      </div>
    );
  }

  // Separate played vs unplayed songs
  const playedSongs = songs.filter(s => !s.isUnplayed);
  const unplayedSongs = songs.filter(s => s.isUnplayed);

  return (
    <div className="space-y-4">
      {/* Played songs with progress */}
      {playedSongs.length > 0 && (
        <div className="space-y-2">
          {playedSongs.map((song) => (
            <SongCard
              key={song.id}
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
          ))}
        </div>
      )}

      {/* Unplayed songs section */}
      {unplayedSongs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide px-1">
            Not yet played ({unplayedSongs.length})
          </p>
          {unplayedSongs.map((song) => (
            <div key={song.id} className={cn("opacity-60")}>
              <SongCard
                name={song.name ?? 'Unknown Song'}
                difficultyLevel={song.difficulty_level}
                difficultyName={song.difficulty_name}
                score={null}
                rank={null}
                flare={null}
                halo={null}
                eamuseId={song.eamuse_id}
                songId={song.song_id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
