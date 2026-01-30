import { SongCard } from '@/components/scores/SongCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScoreWithSong } from '@/hooks/useGoalProgress';

interface CompletedSongsListProps {
  songs: ScoreWithSong[];
  isLoading: boolean;
}

export function CompletedSongsList({ songs, isLoading }: CompletedSongsListProps) {
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
        <p className="text-muted-foreground">No songs completed yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Keep playing to make progress on this goal!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {songs.map((song) => (
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
  );
}
